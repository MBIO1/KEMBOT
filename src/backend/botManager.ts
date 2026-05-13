import { GridStrategy } from './strategies/grid.ts';
import { DCAStrategy } from './strategies/dca.ts';
import db from './db/session.ts';
import { RiskEngine } from './risk/riskEngine.ts';

export class BotManager {
  private activeBots: Map<string, any> = new Map();

  async startBot(id: string) {
    if (RiskEngine.isGlobalKillSwitchActive()) {
      throw new Error('Global kill switch is active. Cannot start new bots.');
    }

    const botData = db.prepare('SELECT * FROM bots WHERE id = ?').get(id) as any;
    if (!botData) throw new Error('Bot not found');

    const config = JSON.parse(botData.config);
    let bot;

    if (botData.strategy === 'GRID') {
      bot = new GridStrategy(botData.id, botData.symbol, config);
    } else if (botData.strategy === 'DCA') {
      bot = new DCAStrategy(botData.id, botData.symbol, config);
    } else {
      throw new Error(`Unknown strategy ${botData.strategy}`);
    }

    await bot.start();
    this.activeBots.set(id, bot);
    db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('RUNNING', id);
  }

  async stopBot(id: string) {
    const bot = this.activeBots.get(id);
    if (bot) {
      await bot.stop();
      this.activeBots.delete(id);
    }
    db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('STOPPED', id);
  }

  async triggerKillSwitch() {
    RiskEngine.enableGlobalKillSwitch('Manual emergency stop triggered by bot manager');
    const runningBots = db.prepare("SELECT id FROM bots WHERE status = 'RUNNING'").all() as any[];
    for (const bot of runningBots) {
      await this.stopBot(bot.id);
    }
  }

  async releaseKillSwitch() {
    RiskEngine.clearGlobalKillSwitch();
  }

  async initFromDb() {
    if (RiskEngine.isGlobalKillSwitchActive()) {
      console.warn('Global kill switch is active, skipping bot restart.');
      return;
    }

    const runningBots = db.prepare("SELECT id FROM bots WHERE status = 'RUNNING'").all() as any[];
    for (const b of runningBots) {
      try {
        await this.startBot(b.id);
      } catch (error) {
        console.error(`Failed to restart bot ${b.id}:`, error);
      }
    }
  }
}
