export type Item = {
  id: string;
  title: string;
  price: number;
  createdAt: number;
  endsAt: number;
  buyNowPrice?: number;
  soldAt?: number;
  soldPrice?: number;
  images: string[];

  relistedFrom?: string;
  relistedTo?: string;
  autoRelistRemaining?: number;
  autoRelistDurationMin?: number;
};

const KEY = "auction-town-items-v1";

function makeId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function normalizeItem(raw: any): Item | null {
  if (!raw) return null;

  const id = typeof raw.id === "string" ? raw.id : makeId();
  const title = typeof raw.title === "string" ? raw.title : "";
  const price = Number(raw.price);
  const createdAtRaw = Number(raw.createdAt);
  const endsAtRaw = Number(raw.endsAt);
  const buyNowRaw = Number(raw.buyNowPrice);
  const buyNowPrice = Number.isFinite(buyNowRaw) && buyNowRaw > 0 ? buyNowRaw : undefined;

  const soldAtRaw = Number(raw.soldAt);
  const soldAt = Number.isFinite(soldAtRaw) ? soldAtRaw : undefined;

  const soldPriceRaw = Number(raw.soldPrice);
  const soldPrice = Number.isFinite(soldPriceRaw) ? soldPriceRaw : undefined;

  let images: string[] = [];
  if (Array.isArray(raw.images)) {
    images = raw.images;
  } else if (typeof raw.imageUrl === "string" && raw.imageUrl) {
    images = [raw.imageUrl];
  }

  if (!title) return null;
  if (!Number.isFinite(price)) return null;

  const createdAt = Number.isFinite(createdAtRaw) ? createdAtRaw : Date.now();
  const endsAt = Number.isFinite(endsAtRaw) ? endsAtRaw : createdAt + 30 * 60 * 1000;

  const relistedFrom = typeof raw.relistedFrom === "string" ? raw.relistedFrom : undefined;
  const relistedTo = typeof raw.relistedTo === "string" ? raw.relistedTo : undefined;

  const autoRelistRemaining = Number.isFinite(Number(raw.autoRelistRemaining))
    ? Number(raw.autoRelistRemaining)
    : undefined;

  const autoRelistDurationMin = Number.isFinite(Number(raw.autoRelistDurationMin))
    ? Number(raw.autoRelistDurationMin)
    : undefined;

  return {
    id,
    title,
    price,
    createdAt,
    endsAt,
    relistedFrom,
    relistedTo,
    autoRelistRemaining,
    autoRelistDurationMin,
    buyNowPrice,
    soldAt,
    soldPrice,
    images,
  };
}

function save(items: Item[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

// ===== 입찰(최고가) =====
const BID_KEY = "auction-town-bids-v1";
type BidsMap = Record<string, number>;

function loadBids(): BidsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(BID_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as BidsMap) : {};
  } catch {
    return {};
  }
}

function saveBids(map: BidsMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BID_KEY, JSON.stringify(map));
}

export function getHighestBid(itemId: string): number {
  const map = loadBids();
  return Number(map[itemId] ?? 0);
}

// ===== 입찰 히스토리 =====
export type BidLog = { itemId: string; price: number; createdAt: number };
const BID_LOG_KEY = "auction-town-bidlogs-v1";

function loadBidLogs(): BidLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BID_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BidLog[]) : [];
  } catch {
    return [];
  }
}

function saveBidLogs(logs: BidLog[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BID_LOG_KEY, JSON.stringify(logs));
}

export function getBidHistory(itemId: string): BidLog[] {
  const logs = loadBidLogs();
  return logs.filter((l) => l.itemId === itemId).sort((a, b) => b.createdAt - a.createdAt);
}

// ===== 자동 재등록 적용 =====
function applyAutoRelist(items: Item[]): Item[] {
  let changed = false;
  const now = Date.now();

  for (const it of items) {
    const ended = now >= it.endsAt;
    const highest = getHighestBid(it.id);
    const unsold = ended && highest === 0;

    const remaining = Number(it.autoRelistRemaining ?? 0);
    const durationMin = Number(it.autoRelistDurationMin ?? 0);

    if (unsold && remaining > 0 && !it.relistedTo) {
      const newId = makeId();
      const mins = Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 30;
      const endsAt = now + mins * 60 * 1000;

      const child: Item = {
        id: newId,
        title: it.title,
        price: it.price,
        createdAt: now,
        endsAt,
        relistedFrom: it.id,
        autoRelistRemaining: remaining - 1,
        autoRelistDurationMin: mins,
        images: it.images,
      };

      it.relistedTo = newId;
      items.unshift(child);
      changed = true;
    }
  }

  if (changed) save(items);
  return items;
}

function load(): Item[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const items = parsed.map(normalizeItem).filter(Boolean) as Item[];
    return applyAutoRelist(items);
  } catch {
    return [];
  }
}

export function addItem(
  title: string,
  price: number,
  endsAt: number,
  autoRelistRemaining?: number,
  autoRelistDurationMin?: number,
  buyNowPrice?: number,
  images: string[] = []
) {
  const items = load();

  const safeEndsAt = Number.isFinite(endsAt) ? endsAt : Date.now() + 30 * 60 * 1000;

  const bn =
    typeof buyNowPrice === "number" && Number.isFinite(buyNowPrice) && buyNowPrice > 0
      ? Math.floor(buyNowPrice)
      : undefined;

  items.unshift({
    id: makeId(),
    title,
    price,
    createdAt: Date.now(),
    endsAt: safeEndsAt,
    autoRelistRemaining,
    autoRelistDurationMin,
    buyNowPrice: bn,
    soldAt: undefined,
    soldPrice: undefined,
    images: images,
  });

  save(items);
}

export function getItems() {
  return load();
}

export function getItemById(id: string) {
  const items = load();
  return items.find((it) => it.id === id) ?? null;
}

export function relistItem(
  itemId: string,
  options?: { newPrice?: number; durationMin?: number }
): { ok: true; newId: string } | { ok: false; message: string } {
  const items = load();
  const it = items.find((x) => x.id === itemId);
  if (!it) return { ok: false, message: "상품이 없어요." };

  const now = Date.now();
  const ended = now >= it.endsAt;
  const highest = getHighestBid(it.id);
  const unsold = ended && highest === 0;

  if (!unsold) return { ok: false, message: "유찰된 상품만 재등록할 수 있어요." };
  if (it.relistedTo) return { ok: false, message: "이미 재등록된 상품이에요." };

  const newId = makeId();
  const mins = Number(options?.durationMin ?? 30);
  const safeMins = Number.isFinite(mins) && mins > 0 ? mins : 30;

  const p = Number(options?.newPrice ?? it.price);
  if (!Number.isFinite(p) || p <= 0) return { ok: false, message: "가격이 올바르지 않아요." };

  const child: Item = {
    id: newId,
    title: it.title,
    price: p,
    createdAt: now,
    endsAt: now + safeMins * 60 * 1000,
    relistedFrom: it.id,
    images: it.images,
  };

  it.relistedTo = newId;
  items.unshift(child);
  save(items);

  return { ok: true, newId };
}

export function placeBid(
  itemId: string,
  bid: number
): { ok: true } | { ok: false; message: string } {
  const items = load();
  const item = items.find((it) => it.id === itemId);
  if (!item) return { ok: false, message: "상품이 없어요." };

  if (item.soldAt) return { ok: false, message: "이미 판매 완료된 상품이에요." };
  if (Date.now() >= item.endsAt) return { ok: false, message: "경매가 마감됐어요." };

  const map = loadBids();
  const current = Number(map[itemId] ?? 0);
  const base = Math.max(item.price, current);
  const step = bidStepFor(base);
  const min = current > 0 ? current + step : item.price;

  if (!Number.isFinite(bid) || bid < min) {
    return { ok: false, message: `입찰가는 최소 ${min.toLocaleString()}원 이상이어야 해요.` };
  }

  map[itemId] = bid;
  saveBids(map);

  const logs = loadBidLogs();
  logs.unshift({ itemId, price: bid, createdAt: Date.now() });
  saveBidLogs(logs);

  return { ok: true };
}

export function bidStepFor(amount: number) {
  const a = Math.max(0, Math.floor(amount));

  if (a < 1000) return 10;
  if (a < 10000) return 100;
  if (a < 100000) return 1000;
  if (a < 1000000) return 5000;
  if (a < 10000000) return 10000;
  return 50000;
}

export function buyNow(itemId: string): { ok: true } | { ok: false; message: string } {
  const items = load();
  const idx = items.findIndex((it) => it.id === itemId);
  if (idx === -1) return { ok: false, message: "상품이 없어요." };

  const item = items[idx];

  if (!item.buyNowPrice || item.buyNowPrice <= 0) {
    return { ok: false, message: "즉시구매가가 설정되지 않았어요." };
  }

  if (item.soldAt) return { ok: false, message: "이미 판매 완료된 상품이에요." };
  const bn = item.buyNowPrice!;

  items[idx] = {
    ...item,
    soldAt: Date.now(),
    soldPrice: bn,
  };
  save(items);

  const map = loadBids();
  map[itemId] = bn;
  saveBids(map);

  return { ok: true };
}

// ✅ [추가됨] 상품 수정 기능
export function updateItem(
  id: string,
  newTitle: string,
  newPrice: number,
  newBuyNow: number | undefined,
  newImages: string[]
): { ok: true } | { ok: false; message: string } {
  const items = load();
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) return { ok: false, message: "상품이 없어요." };

  // 입찰이 있는지 한번 더 체크 (안전장치)
  const highest = getHighestBid(id);
  if (highest > 0) return { ok: false, message: "입찰이 있어서 수정할 수 없어요." };

  const item = items[idx];
  
  // 수정 내용 반영
  items[idx] = {
    ...item,
    title: newTitle,
    price: newPrice,
    buyNowPrice: newBuyNow,
    images: newImages
  };

  save(items);
  return { ok: true };
}