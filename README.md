# Local LLM Chat-Bot API (Node.js + Fastify)

Минималистичный и производительный чат-бот на базе локальных нейросетей, развернутый с использованием Node.js и Fastify. Позволяет взаимодействовать с LLM моделями через REST API с поддержкой стриминга (SSE).

## 🚀 Стек технологий

- **Runtime:** Node.js (v18+)
- **Web Framework:** Fastify
- **LLM Engine:** `node-llama-cpp` (интерфейс для llama.cpp)
- **Model Format:** GGUF
- **API:** REST (JSON) + Server-Sent Events (SSE) для стриминга

## 🛠 Функционал

- **Streaming Response:** Ответы приходят в реальном времени, буква за буквой.
- **Security:** Базовая авторизация по API-ключу (Bearer Token).
- **Flexibility:** Поддержка любой модели в формате GGUF (Llama, Qwen, Mistral, DeepSeek).
- **Efficiency:** Оптимизированный контекст и настройки температуры для стабильной работы на домашнем железе.

## 📦 Инструкция по развертыванию

### 1. Подготовка папки

```bash
mkdir chat-bot-node
cd chat-bot-node
npm init -y
npm install fastify node-llama-cpp
```

### 2. Настройка проекта

Убедитесь, что в <code>package.json</code> добавлен тип модуля:

```json
{
    "type": "module"
}
```

### 3. Модели

Для работы проекта необходимо скачать файл модели в формате <code>.gguf</code> и положить его в папку <code>/model</code>.

#### Рекомендуемые модели:

Qwen 2.5 Coder 3B (Q6_K) — Высокая точность, отлично подходит для кода и логики.

Llama 3.2 3B Instruct — Сбалансированная модель от Meta.

DeepSeek R1 Distill Qwen 1.5B — Легкая модель для быстрых ответов и рассуждений.

#### Где скачать (ссылки):

https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/tree/main

https://huggingface.co/lmstudio-community/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/tree/main

### 4. Запуск сервера

Отредактируйте index.js, указав имя вашего файла модели, и запустите сервер:

```bash
node index.js
```

Сервер будет доступен по адресу: http://localhost:3000/chat

### 📡 Использование API

Отправьте POST запрос с промптом и вашим секретным ключом:

Пример через cURL:

```bash
curl -N -X POST http://localhost:3000/chat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_SECRET_KEY" \
     -d '{"prompt": "Привет, расскажи про REST API"}'
```

### ⚙️ Настройка (Параметры)

В файле <code>index.js</code> вы можете изменить:

<code>contextSize</code>: объем памяти диалога (по умолчанию 2048).

<code>temperature</code>: уровень креативности (рекомендуется 0.5 - 0.7).

<code>maxTokens</code>: максимальная длина ответа.
