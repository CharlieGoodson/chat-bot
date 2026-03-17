import Fastify from 'fastify';
import cors from '@fastify/cors';
import { LlamaModel, LlamaContext, LlamaChatSession, getLlama, ChatMLChatWrapper } from "node-llama-cpp";
import path from "path";
import { fileURLToPath } from "url";

// Конфигурация
const CONFIG = {
    modelName: "qwen2.5-coder-3b-instruct-q6_k.gguf", // Просто меняешь имя здесь
    contextSize: 2048,
    temp: 0.7,
    maxTokens: 1024,
};

// Настройка путей (нужна для корректной работы в ES-модулях)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const modelPath = path.join(__dirname, "model/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf");
const modelPath = path.join(__dirname, `model/${CONFIG.modelName}`);
const fastify = Fastify({ logger: true });

// Инициализация
const llama = await getLlama();
const model = await llama.loadModel({ modelPath });
const context = await model.createContext({ contextSize: CONFIG.contextSize });

// В версии 3.0+ сессия создается вот так:
const session = new LlamaChatSession({ 
    contextSequence: context.getSequence(),
    chatWrapper: new ChatMLChatWrapper(),
    // Добавляем системную инструкцию
    systemPrompt: "You are a helpful and professional AI assistant. Answer the user's questions clearly and accurately in the language of the user's request."
});

// Задай свой секретный ключ
// const API_KEY = "my-secret-key-123";

await fastify.register(cors, { 
    origin: "*",
    methods: ["POST", "GET"]
});

// Единственный POST маршрут для обработки промптов
fastify.post('/chat', async (request, reply) => {
    // Проверка заголовка авторизации
    // const authHeader = request.headers['authorization'];
    
    // if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    //     return reply.code(401).send({ error: "Unauthorized: Invalid API Key" });
    // }

    const { prompt } = request.body;

    if (!prompt) {
        return reply.code(400).send({ error: "Промпт обязателен" });
    }

    // Явно прописываем CORS и SSE заголовки для сырого ответа (reply.raw)
    reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*', // РЕШАЕТ ПРОБЛЕМУ CORS
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    });

    try {
        console.log(`\n--- Вопрос: ${prompt} ---`);

        // Используем стандартный prompt, но с обработчиком токенов
        await session.prompt(prompt, {
            onToken: (tokens) => {
                const chunk = model.detokenize(tokens);
                process.stdout.write(chunk); // Видим процесс в консоли сервера
                reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            },
            maxTokens: CONFIG.maxTokens,
            temperature: CONFIG.temp,
            repeatPenalty: {
                penalty: 1.1,      // Штраф за повторы
                edgeCaseHandling: true,
            }
        });

        reply.raw.write('data: [DONE]\n\n');
        reply.raw.end();
        console.log("\n--- Ответ завершен ---");

    } catch (error) {
        console.error("Ошибка генерации:", error);
        if (!reply.raw.writableEnded) {
            reply.raw.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            reply.raw.end();
        }
    }
});

// Запуск сервера
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log('🚀 Сервер запущен на http://localhost:3000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();