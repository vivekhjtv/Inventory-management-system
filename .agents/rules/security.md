# Security & Privacy: Environment Variables Protection

> **CRITICAL DIRECTIVE**: AI agents are strictly forbidden from accessing, reading, or inspecting `.env` files.

## Rules:
1. **Never Read `.env` Files**: Do not call `view_file`, `grep_search`, or terminal commands (e.g., `cat`, `head`, `tail`) targeting `.env`, `.env.local`, `.env.production`, or any related env file.
2. **Never Expose Secrets**: Never print, summarize, or log secrets, passwords, connection strings, or cryptographic keys.
3. **Use Placeholders**: For setup and documentation, always provide dummy connection templates via `.env.example` or in documentation.
