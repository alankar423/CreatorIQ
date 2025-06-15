// Authentication and authorization types

export interface AuthUser {
 id: string;
 email: string;
 name: string;
 avatarUrl?: string;
 subscriptionStatus: 'FREE' | 'CREATOR' | 'PRO' | 'CANCELLED' | 'PAST_DUE' | 'UNPAID';
 permissions: UserPermission[];
 quotaInfo: {
   monthly: number;
   used: number;
   remaining: number;
   resetDate: string;
 };
}

export enum UserPermission {
 CREATE_ANALYSIS = 'CREATE_ANALYSIS',
 VIEW_ANALYSIS = 'VIEW_ANALYSIS',
 EXPORT_DATA = 'EXPORT_DATA',
 SAVE_CHANNELS = 'SAVE_CHANNELS',
 ACCESS_API = 'ACCESS_API',
 UNLIMITED_ANALYSES = 'UNLIMITED_ANALYSES',
 PRIORITY_SUPPORT = 'PRIORITY_SUPPORT'
}

export interface JWTPayload {
 userId: string;
 email: string;
 subscriptionStatus: string;
 permissions: UserPermission[];
 iat: number;
 exp: number;
}

export interface AuthSession {
 user: AuthUser;
 token: string;
 refreshToken: string;
 expiresAt: string;
}

export interface LoginCredentials {
 email: string;
 password: string;
 rememberMe?: boolean;
}

export interface GoogleAuthCredentials {
 token: string;
 redirectUri?: string;
}

export interface SignupCredentials {
 email: string;
 password: string;
 name: string;
 agreeToTerms: boolean;
}

export interface PasswordResetRequest {
 email: string;
}

export interface PasswordResetConfirm {
 token: string;
 newPassword: string;
}

export interface EmailVerificationRequest {
 token: string;
}

// Auth context types for React
export interface AuthContextType {
 user: AuthUser | null;
 isAuthenticated: boolean;
 isLoading: boolean;
 login: (credentials: LoginCredentials) => Promise<void>;
 loginWithGoogle: (credentials: GoogleAuthCredentials) => Promise<void>;
 signup: (credentials: SignupCredentials) => Promise<void>;
 logout: () => void;
 refreshToken: () => Promise<void>;
 hasPermission: (permission: UserPermission) => boolean;
 canCreateAnalysis: () => boolean;
}
