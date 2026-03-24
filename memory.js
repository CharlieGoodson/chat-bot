import fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const SESSIONS_DIR = path.join(process.cwd(), 'sessions')
if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR)
}

export async function saveSessionToFile(sessionId, session) {
    // Получаем историю в формате, который понимает библиотека
    const history = session.getChatHistory()
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`)
    await fs.writeFile(filePath, JSON.stringify(history, null, 2))
    console.log(`[Persistence] История сессии ${sessionId} сохранена.`)
}

export async function loadSessionFromFile(sessionId) {
    // Пытаемся прочитать старую историю
    let history = []
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`)
    try {
        if (existsSync(filePath)) {
            const fileData = await fs.readFile(filePath, 'utf-8')
            history = JSON.parse(fileData)
            console.log(`[Persistence] История для ${sessionId} восстановлена.`)

            const MAX_MESSAGES = 10

            if (history.length > MAX_MESSAGES) {
                console.log(
                    `[Trimming] История слишком длинная, оставляю последние ${MAX_MESSAGES} сообщений.`,
                )
                historyhistory.slice(-MAX_MESSAGES)
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки истории:', e)
    }
    console.log('history', history)
    return history
}
