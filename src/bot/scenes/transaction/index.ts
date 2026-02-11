import { Scenes } from 'telegraf';
import { BotContext } from '../../../types';
import { step1_parse } from './steps/parser';
import { step2_merchant } from './steps/merchant';
import { step3_payment } from './steps/payment';
import { step4_confirm } from './steps/confirm';
import { step5_action } from './steps/action';
import { SCENE_ID } from './constants';

export { SCENE_ID } from './constants';

export const transactionScene = new Scenes.WizardScene<BotContext>(
  SCENE_ID,
  step1_parse,
  step2_merchant,
  step3_payment,
  step4_confirm,
  step5_action
);
