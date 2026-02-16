# AI Snake - Dynamic Challenge Edition

## Vertical
**Interactive Entertainment / Gaming**

## Approach and Logic
This project reimagines the classic Snake game by integrating a "Dungeon Master" AI powered by **Google Gemini**. Instead of a static difficulty curve, the game uses Generative AI to create dynamic, context-aware challenges and trivia, making every session unique.

### Core Architecture
1.  **Frontend**: Built with **React**, **TypeScript**, and **Vite** for a performant, type-safe development environment.
2.  **Game Engine**: A custom `SnakeGame` class (vanilla TypeScript) manages the game loop, changing state, collision detection, and rendering to an HTML5 Canvas. This ensures smooth 60fps performance independent of React's render cycle.
3.  **AI Layer (Google Gemini)**: The `GeminiService` acts as the bridge between the game state and Google's LLM. It prompts the model to generate:
    -   **Dynamic Challenges**: Unique gameplay conditions (e.g., "Eat 5 apples in 10 seconds due to a sudden hunger pang").
    -   **Thematic Trivia**: Fun facts related to the current visual theme (Neon, Jungle, Volcanic) displayed during pauses or game over screens.

### Logic Flow
1.  **Initialization**: The game starts in a "Menu" state. The `GeminiService` checks for an API key.
2.  **Gameplay Loop**: The active challenge is monitored (e.g., `survive_time`, `eat_target`).
3.  **AI Intervention**: periodically, or upon specific events (like reaching a score threshold), the game requests a new challenge from Gemini.
4.  **Fallback System**: Robust error handling ensures that if the AI service is unreachable or rate-limited, the game seamlessly switches to a pre-defined "Mock Mode" so functionality is never lost.

## How the Solution Works
1.  **Clone & Setup**:
    -   Clone the repository.
    -   Install dependencies: `npm install`.
    -   Set `VITE_GEMINI_API_KEY` in your `.env` file.
2.  **Play**:
    -   Run `npm run dev`.
    -   Control the snake with Arrow Keys or WASD.
    -   Watch for "Mission Updates" at the top of the HUD.
3.  **AI Features**:
    -   **Smart Challenges**: The AI analyzes the game context (e.g., "User is playing cautiously") and generates a challenge to disrupt it (e.g., "Speed Up!").
    -   **Flavor Text**: Game-over screens act as a moment of learning with AI-generated trivia.

## Google Services Integration
-   **Google Gemini (Generative AI)**: Used via the Google Gen AI SDK (`@google/generative-ai`) to generate JSON-structured game data and text.
    -   *Model*: `gemini-1.5-flash` (optimized for speed/latency).

## Assumptions
-   The user has a valid Google Cloud API Key with access to Gemini.
-   The user is running the application in a modern web browser interacting with the HTML5 Canvas API.
-   A stable internet connection is available for the full AI experience (though offline play is supported via mocks).
