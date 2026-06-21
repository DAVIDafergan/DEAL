/**
 * DealQueue — תור in-memory פשוט עם ניסיונות חזרה (retry).
 * המטרה: אם ערוץ הפצה אחד נכשל (למשל Telegram timeout), לא לאבד את הדיל — הוא חוזר לתור
 * ומנסים שוב, בלי שזה ישפיע על ערוצים אחרים שכן הצליחו.
 *
 * Simple in-memory queue with retry. Not durable across restarts by design — this is the
 * starting point the spec asks for; swapping in Redis/SQS later only touches this file.
 */
const DEFAULT_MAX_ATTEMPTS = 3;

export class DealQueue {
  constructor({ maxAttempts = DEFAULT_MAX_ATTEMPTS } = {}) {
    this.maxAttempts = maxAttempts;
    this._queue = [];
    this._deadLetter = [];
  }

  enqueue(job) {
    this._queue.push({ job, attempts: 0 });
  }

  size() {
    return this._queue.length;
  }

  deadLetterSize() {
    return this._deadLetter.length;
  }

  /**
   * מעבד את כל התור: מריץ handler על כל פריט, ובמקרה כשלון מחזיר אותו לתור עד maxAttempts,
   * ואז מעביר ל-dead letter כדי שאפשר יהיה לבדוק מה נכשל סופית.
   */
  async drain(handler) {
    const results = [];

    while (this._queue.length > 0) {
      const item = this._queue.shift();
      try {
        const result = await handler(item.job);
        results.push({ job: item.job, success: true, result });
      } catch (err) {
        item.attempts += 1;
        if (item.attempts < this.maxAttempts) {
          this._queue.push(item);
        } else {
          this._deadLetter.push({ ...item, error: err.message });
          results.push({ job: item.job, success: false, error: err.message });
        }
      }
    }

    return results;
  }
}
