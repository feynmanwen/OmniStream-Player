import { UserAccount } from '../types/player';

export interface PredefinedUser {
  username: string;
  pin: string;
  displayName: string;
  avatarColor: string;
}

/** 預設 4 位使用者與其通行密碼 (如需求指定) */
export const PREDEFINED_USERS: PredefinedUser[] = [
  { username: 'Feynman', pin: '6786', displayName: 'Feynman', avatarColor: '#fa2d48' },
  { username: 'Ray', pin: '0413', displayName: 'Ray', avatarColor: '#38bdf8' },
  { username: 'Sunny', pin: '0726', displayName: 'Sunny', avatarColor: '#f59e0b' },
  { username: 'Softchi', pin: '1218', displayName: 'Softchi', avatarColor: '#10b981' },
];

const STORAGE_KEY_AUTH_USER = 'omnistream_active_user_v1';

/** 驗證使用者帳號與密碼 (支援不分大小寫比對帳號) */
export function verifyCredentials(usernameInput: string, pinInput: string): UserAccount | null {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPin = pinInput.trim();

  const matched = PREDEFINED_USERS.find(
    (u) => u.username.toLowerCase() === cleanUser && u.pin === cleanPin
  );

  if (!matched) return null;

  return {
    username: matched.username,
    displayName: matched.displayName,
    avatar: matched.avatarColor,
  };
}

/** 讀取目前本機記住的登入使用者 (下一次進入不用重複輸入) */
export function getSavedActiveUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_USER);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

/** 儲存目前登入使用者至本機持久化空間 */
export function saveActiveUser(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    }
  } catch (e) {
    console.warn('無法儲存登入使用者:', e);
  }
}
