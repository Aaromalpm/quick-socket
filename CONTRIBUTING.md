# Contributing to quick-socket

First of all, thank you for taking the time to contribute! Every contribution helps make this package better for everyone.

---

## How Can You Help?

- Fix a bug
- Add a new feature
- Improve the documentation
- Write tests
- Share the package with others

---

## Getting Started

### 1. Fork the repo

Click the **Fork** button on GitHub to create your own copy.

### 2. Clone your fork

```bash
git clone https://github.com/YOUR_USERNAME/quick-socket.git
cd quick-socket
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run the tests

```bash
npm test
```

All tests should pass before you start making changes.

---

## Making Changes

### 1. Create a new branch

```bash
git checkout -b feature/your-feature-name
```

Use a clear branch name like:
- `feature/add-typescript`
- `fix/room-memory-leak`
- `docs/improve-readme`

### 2. Make your changes

Keep your changes focused — one feature or fix per pull request.

### 3. Run tests again

```bash
npm test
```

Make sure all tests still pass. If you added a new feature, add a test for it too.

### 4. Commit your changes

```bash
git add .
git commit -m "feat: add your feature description"
```

Use clear commit messages:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for adding tests

### 5. Push and open a Pull Request

```bash
git push origin feature/your-feature-name
```

Then go to GitHub and open a Pull Request. Describe what you changed and why.

---

## Good First Issues

New to open source? These are real open issues — pick one and comment on it to claim it:

| Issue | What to do |
|-------|-----------|
| [#17 — Test: presence system](https://github.com/Aaromalpm/quick-socket/issues/17) | Write tests for `trackPresence`, `setPresence`, `getPresence`, `getRoomPresence` |
| [#18 — Test: rate limiter](https://github.com/Aaromalpm/quick-socket/issues/18) | Write tests for `createRateLimiter` — window reset, blocked packets, custom callback |
| [#19 — Test: reconnect recovery](https://github.com/Aaromalpm/quick-socket/issues/19) | Write tests for `rejoinRooms` and `getUserRooms` |

These are great starting points if you're new to open source. All three just need tests — no new logic required.

Look for issues labeled **"good first issue"** on GitHub for more.

---

## What We Are Looking For

- Clean, readable code
- No unnecessary dependencies
- Tests for new features
- Clear commit messages
- Respectful communication

---

## What to Avoid

- Large unrelated changes in one PR
- Breaking existing functionality
- Removing tests

---

## Need Help?

Open an issue on GitHub and we'll help you get started. No question is too small!

---

## Code Style

- Use `camelCase` for variables and functions
- Keep functions small and focused
- No comments unless the logic is truly complex

---

Thank you for contributing!
