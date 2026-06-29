# ZNF Portal - 具身训练场 V1 系统蓝图

## 系统定位
训练场资源调度与执行记录系统（非CRM/非ERP/非IoT）

---

## 核心对象

### 资源层
- Zone（空间）
- Device（设备，绑定Zone）

### 调度层
- ZoneBooking（空间预约）
- DeviceBooking（设备预约）
- VisitBooking（参观预约）

### 运营层
- WorkOrder（工单）
- VisitRecord（参观记录）
- InquiryRecord（线索记录）

---

## 核心能力

### 1. 预约系统
- 三类预约独立模型
- 基于时间+资源冲突检测

### 2. 冲突机制
- Zone时间冲突
- Device时间冲突

### 3. 执行记录
- Booking状态流转
- Visit落地记录
- 工单闭环

---

## 禁止范围（V1）
- CRM流程系统
- 统一调度引擎
- IoT接入
- 财务系统
- AI系统
