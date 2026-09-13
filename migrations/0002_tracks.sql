-- Family mix library. Rows are unowned (auth-off): anyone with the app link
-- can listen and add tracks. No personal names, emails, or bulk wipe.

create table if not exists tracks (
  id          text primary key,
  title       text not null,
  artist      text not null default '',
  duration_ms integer not null default 0,
  mime_type   text not null default 'audio/mpeg',
  file_size   integer not null default 0,
  chunk_count integer not null default 0,
  peaks       text not null default '[]',
  cover_seed  integer not null default 0,
  ready       boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists tracks_ready_created_idx
  on tracks (ready, created_at desc);

create table if not exists track_chunks (
  track_id text not null references tracks(id) on delete cascade,
  idx      integer not null,
  data     text not null,
  primary key (track_id, idx)
);
