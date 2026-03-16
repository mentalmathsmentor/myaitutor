import { prebuiltAppConfig } from '@mlc-ai/web-llm';

console.log("--- AVAILABLE CLIPBOARD ---");
const models = prebuiltAppConfig.model_list.map(m => m.model_id);
console.log(models.join('\\n'));
