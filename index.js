import Fastify from 'fastify'
import cors from '@fastify/cors'
import {
    // LlamaModel,
    // LlamaContext,
    LlamaChatSession,
    getLlama,
    ChatMLChatWrapper,
} from 'node-llama-cpp'
import path from 'path'
import { fileURLToPath } from 'url'

// Конфигурация
const CONFIG = {
    modelName: 'qwen2.5-coder-3b-instruct-q6_k.gguf', // Просто меняешь имя здесь
    contextSize: 4096,
    temp: 0.7,
    maxTokens: 512,
    maxParallelUsers: 2,
}

// Настройка путей (нужна для корректной работы в ES-модулях)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// const modelPath = path.join(__dirname, "model/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf");
const modelPath = path.join(__dirname, `model/${CONFIG.modelName}`)
const fastify = Fastify({ logger: true })

// Инициализация
const llama = await getLlama()
const model = await llama.loadModel({ modelPath })

// Создаем контекст ОДИН раз (наше общее игровое поле)
const context = await model.createContext({
    contextSize: CONFIG.contextSize,
    sequences: CONFIG.maxParallelUsers,
})

// Наша "Картотека" сессий
const userSessions = new Map()

// Задай свой секретный ключ
const API_KEY = 'my-secret-key-123'

await fastify.register(cors, {
    origin: '*',
    methods: ['POST', 'GET'],
})

// Храним статусы активности
const activeProcessing = new Set()

// Единственный POST маршрут для обработки промптов
fastify.post('/chat', async (request, reply) => {
    // Проверка заголовка авторизации
    const authHeader = request.headers['authorization']

    if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
        return reply.code(401).send({ error: 'Unauthorized: Invalid API Key' })
    }

    const { prompt, sessionId } = request.body

    if (!prompt || !sessionId) {
        return reply.code(400).send({ error: 'Нужны prompt и sessionId' })
    }

    // Ищем сессию пользователя или создаем новую
    let sessionData = userSessions.get(sessionId)

    if (!sessionData) {
        // ПРОВЕРКА: Если мест на "парковке" больше нет
        if (userSessions.size >= CONFIG.maxParallelUsers) {
            // Ищем первую НЕ активную сессию
            let idToDispose = null
            for (const [id, data] of userSessions.entries()) {
                if (!activeProcessing.has(id)) {
                    idToDispose = id
                    break
                }
            }
            if (idToDispose) {
                console.log(`[Capacity] Принудительно освобождаю слот: ${idToDispose}`)
                const data = userSessions.get(idToDispose)
                await data.session.dispose()
                data.sequence.dispose()
                // Даем Node.js один "тик", чтобы нативный слой точно обновил состояние
                // await new Promise(setImmediate)
                await new Promise((resolve) => setTimeout(resolve, 200)) // КОСТЫЛЬ: Ждем чуть-чуть, чтобы гарантировать освобождение ресурсов
                userSessions.delete(idToDispose)
            } else {
                // Если ВООБЩЕ ВСЕ 4 сессии сейчас генерируют ответ одновременно
                return reply
                    .code(503)
                    .send({ error: 'Сервер перегружен, подождите завершения других запросов' })
            }
        }

        console.log(`[New Session] Создаю новую сессию для: ${sessionId}`)
        const sequence = context.getSequence()
        const session = new LlamaChatSession({
            contextSequence: sequence,
            chatWrapper: new ChatMLChatWrapper(),
            // Добавляем системную инструкцию
            systemPrompt:
                "You are a helpful and professional AI assistant. Answer the user's questions clearly and accurately in the language of the user's request.",
        })
        sessionData = { session, sequence }
        userSessions.set(sessionId, sessionData)
    }

    // 1. Создаем контроллер для этого конкретного запроса
    const abortController = new AbortController()

    // Слушаем закрытие соединения на объекте ОТВЕТА
    reply.raw.on('close', () => {
        if (!reply.raw.writableEnded) {
            console.log('\n🛑 Клиент разорвал соединение. Останавливаю модель...')
            abortController.abort() // Посылаем сигнал отмены в библиотеку
        }
    })

    // Явно прописываем CORS и SSE заголовки для сырого ответа (reply.raw)
    reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*', // РЕШАЕТ ПРОБЛЕМУ CORS
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    })

    // --- НАЧАЛО ГЕНЕРАЦИИ ---
    activeProcessing.add(sessionId) // Пометили: "Я занят!"

    try {
        console.log(`\n--- Вопрос: ${prompt} ---`)

        // Используем стандартный prompt, но с обработчиком токенов
        await sessionData.session.prompt(prompt, {
            signal: abortController.signal, // САМЫЙ ВАЖНЫЙ МОМЕНТ
            onToken: (tokens) => {
                if (abortController.signal.aborted) return
                const chunk = model.detokenize(tokens)
                // process.stdout.write(chunk)
                reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`)
            },
            maxTokens: CONFIG.maxTokens,
            temperature: CONFIG.temp,
            repeatPenalty: {
                penalty: 1.1, // Штраф за повторы
                edgeCaseHandling: true,
            },
        })

        // Если дошли сюда — значит генерация завершилась сама
        if (!abortController.signal.aborted) {
            reply.raw.write('data: [DONE]\n\n')
            reply.raw.end()
            console.log('\n--- Ответ завершен ---')
        }
    } catch (error) {
        // Библиотека может выброситьAbortError при отмене — это нормально
        if (error.name === 'AbortError' || abortController.signal.aborted) {
            console.log('--- Генерация успешно прервана через Signal ---')
        } else {
            console.error('\n❌ Ошибка:', error)
        }
        if (!reply.raw.writableEnded) {
            reply.raw.end()
        }
    } finally {
        activeProcessing.delete(sessionId) // Пометили: "Я свободен!"

        // Обновляем позицию в Map (LRU), чтобы стать "самым свежим" после ответа
        userSessions.delete(sessionId)
        userSessions.set(sessionId, sessionData)
    }
})

// Запуск сервера
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' })
        console.log('🚀 Сервер запущен на http://localhost:3000')
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()
