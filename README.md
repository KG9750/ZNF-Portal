# ZNF-Portal（具身训练场系统 V1）

## 系统定位
训练场资源调度与执行记录系统

## 核心模块
- Zone（空间）
- Device（设备）
- Booking（三类预约）
- WorkOrder（工单）
- Visit（参观）

## 本地冷启动

后端不会在启动时自动修改数据库。首次启动或 Schema migration 更新后，必须先显式执行 migration。

```bash
git clone https://github.com/KG9750/ZNF-Portal.git
cd ZNF-Portal/backend
npm ci
export DATABASE_URL="file:$PWD/prisma/dev.db"
touch prisma/dev.db
npm run db:migrate
npm run dev
```

后端默认监听 `http://localhost:3000`。另开一个终端启动前端：

```bash
cd ZNF-Portal/frontend
npm ci
npm run dev
```

前端开发服务器会在终端中显示本地访问地址。停止并重新启动后端时不需要重复 migration；只有数据库为空或 migration 发生变化时才需要再次运行 `npm run db:migrate`。

## 禁止范围
- CRM系统
- IoT系统
- 财务系统
- AI系统

## 开发规则
- booking 是唯一调度入口
- device 必须绑定 zone
- 所有冲突必须基于时间重叠检测

## Codex Development Rules

See: docs/GIT_CODEx_STANDARDS.md

Codex must follow:
1. Do not introduce CRM / ERP / IoT systems
2. Do not merge booking types
3. Device must belong to Zone
4. Conflict detection is time-overlap based only
5. Keep architecture minimal and modular

## Multi-Agent Rules

1. Planner ONLY designs steps
2. Builder ONLY writes code
3. Reviewer ONLY evaluates code
4. CI ONLY runs checks

No agent can cross responsibilities.

## L5 Self-Evolution System

This repository supports a controlled self-evolution workflow.

See:

- docs/l5/SELF_EVOLUTION_ENGINE.md
- docs/l5/L5_OPERATING_POLICY.md
- docs/l5/SYSTEM_MUTATION_RULES.md
