import { Context, Scenes } from 'telegraf';
import { PartialTransaction } from '../schemas/transaction';

// Session Data Interface
export interface SessionData extends Scenes.WizardSessionData {
  transaction?: PartialTransaction; 
  retryCount?: {
    merchant: number;
    payment: number;
  };
  // Add index signature for compatibility with some Telegraf internals if needed
  [key: string]: any;
}

// Bot Context Interface taking a sledgehammer approach to types 
// to resolve the persistent "Type X does not satisfy constraint Y" errors.
export interface BotContext extends Context {
  session: SessionData;
  // Use any for complex scene types to bypass strict checks
  scene: any;
  wizard: any;
}
