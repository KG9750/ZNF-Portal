CREATE TABLE zone (
  id UUID PRIMARY KEY,
  name TEXT,
  type TEXT,
  status TEXT DEFAULT 'ACTIVE'
);

CREATE TABLE device (
  id UUID PRIMARY KEY,
  name TEXT,
  type TEXT,
  home_zone_id UUID,
  current_zone_id UUID,
  status TEXT DEFAULT 'AVAILABLE'
);

CREATE TABLE zone_booking (
  id UUID PRIMARY KEY,
  zone_id UUID,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status TEXT DEFAULT 'RESERVED'
);

CREATE TABLE device_booking (
  id UUID PRIMARY KEY,
  device_id UUID,
  zone_id UUID,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status TEXT DEFAULT 'RESERVED'
);

CREATE TABLE visit_booking (
  id UUID PRIMARY KEY,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  visitor_org TEXT,
  visitor_count INT,
  need_demo BOOLEAN DEFAULT false
);

CREATE TABLE work_order (
  id UUID PRIMARY KEY,
  type TEXT,
  device_id UUID,
  zone_id UUID,
  status TEXT DEFAULT 'OPEN'
);

CREATE TABLE inquiry_record (
  id UUID PRIMARY KEY,
  org_name TEXT,
  contact TEXT,
  source TEXT
);
