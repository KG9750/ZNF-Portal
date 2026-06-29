# ZNF-Portal｜Git + Codex 开发规范

---

# 🧠 1. 分支规范

main → 稳定版本
feature/* → Codex开发分支

命名：
feature/task-01-init-backend

---

# 🤖 2. Codex执行流程

Issue → Branch → Code → Commit → PR → CI → Merge

---

# 📌 3. Codex规则

1. 必须从 Issue 开始
2. 只做 Issue范围内的事
3. 不允许扩展系统设计
4. 不允许跨任务修改

---

# 🧱 4. PR规范

PR标题：
TASK-xx: description

必须包含：
- Closes #issue
- scope说明

---

# ⚙️ 5. CI规则

必须通过：
- backend build
- frontend build

失败必须修复

---

# 🔐 6. 禁止行为

- 不准改架构
- 不准做CRM/ERP/IoT扩展
- 不准合并多个任务

---

# 🧠 7. 核心原则

1 Issue = 1 Branch = 1 PR
