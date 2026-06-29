# ZNF-Portal（具身训练场系统 V1）

## 系统定位
训练场资源调度与执行记录系统

## 核心模块
- Zone（空间）
- Device（设备）
- Booking（三类预约）
- WorkOrder（工单）
- Visit（参观）

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
