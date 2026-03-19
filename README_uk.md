# Local LLM Chat-Bot API (Node.js + Fastify)

Мінімалістичний та продуктивний чат-бот на базі локальних нейромереж, розгорнутий з використанням Node.js та Fastify. Дозволяє взаємодіяти з LLM моделями через REST API з підтримкою стрімінгу (SSE).

## 🚀 Стек технологій

- **Runtime:** Node.js (v18+)
- **Web Framework:** Fastify
- **LLM Engine:** `node-llama-cpp` (інтерфейс для llama.cpp)
- **Model Format:** GGUF
- **API:** REST (JSON) + Server-Sent Events (SSE) для стрімінгу

## 🛠 Функціонал

- **Streaming Response:** Відповіді надходять у реальному часі, буква за буквою.
- **Stop Generation:** Можливість примусово зупинити генерацію відповіді в будь-який момент.
- **Chat History:** Автоматичне збереження історії листування в межах сесії.
- **Security:** Базова авторизація за API-ключем (Bearer Token).
- **Flexibility:** Підтримка будь-якої моделі у форматі GGUF (Llama, Qwen, Mistral, DeepSeek).
- **Efficiency:** Оптимізований контекст та налаштування температури для стабільної роботи на домашньому залізі.

## 📦 Інструкція з розгортання

### 1. Клонування репозиторію

```bash
git clone [адреса репозиторію]
```

### 2. Налаштування проєкту

Переконайтеся, що в <code>package.json</code> додано тип модуля:

```json
{
    "type": "module"
}
```
Потім встановіть необхідні пакети

```bash
npm install
```

### 3. Моделі

Для роботи проєкту необхідно завантажити файл моделі у форматі <code>.gguf</code> і покласти його в папку <code>/model</code>.

#### Рекомендовані моделі:

Qwen 2.5 Coder 3B (Q6_K) — Висока точність, чудово підходить для коду та логіки.

Llama 3.2 3B Instruct — Збалансована модель від Meta.

DeepSeek R1 Distill Qwen 1.5B — Легка модель для швидких відповідей та міркувань.

#### Де завантажити (посилання):

https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/tree/main

https://huggingface.co/lmstudio-community/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/tree/main

### 4. Запуск сервера

Відредагуйте index.js, вказавши ім'я вашого файлу моделі, і запустіть сервер:

```bash
npm start
```

Сервер буде доступний за адресою: http://localhost:3000/chat

### 📡 Використання API

Надішліть POST запит із промптом та вашим секретним ключем:

Приклад через cURL:

```bash
curl -N -X POST http://localhost:3000/chat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_SECRET_KEY" \
     -d '{"prompt": "Привіт, розкажи про REST API"}'
```

### ⚙️ Налаштування (Параметри)

У файлі <code>index.js</code> ви можете змінити:

<code>contextSize</code>: обсяг пам'яті діалогу (за замовчуванням 2048).

<code>temperature</code>: рівень креативності (рекомендується 0.5 - 0.7).

<code>maxTokens</code>: максимальна довжина відповіді.
