const Queue = require('bull');
const { sendEmail } = require('./emailService');
const Notification = require('../models/Notification');

class QueueService {
  constructor() {
    this.queues = {};
    this.initialized = false;
    this.fallbackMode = true; // Direct fallback mode
    console.log('📦 Using in-memory queue system (Redis disabled)');
    this.setupInMemoryFallback();
  }

  setupInMemoryFallback() {
    console.log('📦 Setting up in-memory queue fallback');
    
    this.fallbackQueue = {
      jobs: [],
      
      async add(jobData, options = {}) {
        const job = {
          id: Date.now() + Math.random(),
          data: jobData,
          status: 'pending',
          createdAt: new Date(),
          attempts: 0,
          maxAttempts: options.attempts || 3
        };
        
        this.jobs.push(job);
        
        // Process after a small delay
        setTimeout(() => this.processJob(job), 100);
        
        return Promise.resolve({ id: job.id, data: job.data });
      },

      async processJob(job) {
        try {
          job.status = 'processing';
          job.startedAt = new Date();
          
          console.log(`⚙️ Processing job ${job.id} (type: ${job.data.type})`);
          
          if (job.data.type === 'email') {
            await this.processEmail(job.data);
          } else if (job.data.type === 'notification') {
            await Notification.create(job.data);
          }
          
          job.status = 'completed';
          job.completedAt = new Date();
          console.log(`✅ Job ${job.id} completed`);
        } catch (error) {
          job.status = 'failed';
          job.error = error.message;
          job.attempts++;
          
          if (job.attempts < job.maxAttempts) {
            console.log(`🔄 Retrying job ${job.id} (attempt ${job.attempts})`);
            setTimeout(() => this.processJob(job), 5000 * job.attempts);
          } else {
            console.error(`❌ Job ${job.id} failed:`, error.message);
          }
        }
      },

      async processEmail(data) {
        console.log(`📧 Sending email to: ${data.to || data.email}`);
        await sendEmail(data);
      },

      getJobCounts() {
        return {
          waiting: this.jobs.filter(j => j.status === 'pending').length,
          active: this.jobs.filter(j => j.status === 'processing').length,
          completed: this.jobs.filter(j => j.status === 'completed').length,
          failed: this.jobs.filter(j => j.status === 'failed').length,
          delayed: 0
        };
      }
    };
    
    this.initialized = true;
  }

  async addEmailJob(jobData, options = {}) {
    return this.fallbackQueue.add({ ...jobData, type: 'email' }, options);
  }

  async addNotificationJob(jobData, options = {}) {
    return this.fallbackQueue.add({ ...jobData, type: 'notification' }, options);
  }

  async getQueueStatus() {
    if (this.fallbackMode && this.fallbackQueue) {
      return {
        email: this.fallbackQueue.getJobCounts(),
        notification: this.fallbackQueue.getJobCounts(),
        fallback: true
      };
    }
    return { fallback: true };
  }
}

module.exports = new QueueService();