import type { User, Session } from 'better-auth';

declare global {
	namespace App {
		interface Locals {
			user: User;
			session: Session;
		}
		interface Error {
			message: string;
			error?: string;
			errorId?: string;
			retryAfterMs?: number;
		}
	}
}

export {};
