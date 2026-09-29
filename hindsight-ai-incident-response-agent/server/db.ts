import { MongoClient, Db, Collection } from 'mongodb';
import { config } from './config';
import { Incident, PostMortem, HindsightMemoryRecord } from '../src/types';
import { SEED_INCIDENTS, SEED_POSTMORTEM_PAYMENT } from './seeds';

class DatabaseManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected: boolean = false;
  private connectionError: string | null = null;

  // In-memory demo fallback stores
  private memIncidents: Map<string, Incident> = new Map();
  private memPostMortems: Map<string, PostMortem> = new Map();

  constructor() {
    // Seed in-memory store
    for (const inc of SEED_INCIDENTS) {
      this.memIncidents.set(inc.id, JSON.parse(JSON.stringify(inc)));
    }
    this.memPostMortems.set(SEED_POSTMORTEM_PAYMENT.incidentId, JSON.parse(JSON.stringify(SEED_POSTMORTEM_PAYMENT)));
  }

  public async init(): Promise<void> {
    if (!config.mongodb.isConfigured) {
      this.connectionError = 'MONGODB_URI not configured. Running with in-memory persistence in DEMO MODE.';
      return;
    }

    try {
      this.client = new MongoClient(config.mongodb.uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });

      await this.client.connect();
      this.db = this.client.db(config.mongodb.dbName);
      this.isConnected = true;
      this.connectionError = null;

      // Create indexes for production performance
      await this.ensureIndexes();
      console.log(`[MongoDB] Connected successfully to Atlas database: ${config.mongodb.dbName}`);
    } catch (err: any) {
      this.isConnected = false;
      this.connectionError = err.message || 'Failed to connect to MongoDB Atlas';
      console.warn(`[MongoDB] Connection failed: ${this.connectionError}. Falling back to in-memory store.`);
    }
  }

  private async ensureIndexes(): Promise<void> {
    if (!this.db) return;
    try {
      const incidentsCol = this.db.collection('incidents');
      await incidentsCol.createIndex({ id: 1 }, { unique: true });
      await incidentsCol.createIndex({ status: 1, severity: 1 });
      await incidentsCol.createIndex({ serviceName: 1 });
      await incidentsCol.createIndex({ createdAt: -1 });

      const auditCol = this.db.collection('audit_logs');
      await auditCol.createIndex({ timestamp: -1 });
      await auditCol.createIndex({ targetId: 1 });

      const postMortemCol = this.db.collection('postmortems');
      await postMortemCol.createIndex({ incidentId: 1 }, { unique: true });
    } catch (e: any) {
      console.warn('[MongoDB] Index creation warning:', e.message);
    }
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      mode: this.isConnected ? ('atlas_persistent' as const) : ('in_memory_demo' as const),
      details: this.isConnected
        ? `Connected to MongoDB Atlas (${config.mongodb.dbName})`
        : this.connectionError || 'In-Memory Demo persistence active',
    };
  }

  // --- Incident CRUD ---

  public async getIncidents(query?: {
    status?: string;
    severity?: string;
    serviceName?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ incidents: Incident[]; total: number; page: number; totalPages: number }> {
    const page = query?.page || 1;
    const limit = query?.limit || 20;

    if (this.isConnected && this.db) {
      const filter: any = {};
      if (query?.status && query.status !== 'all') filter.status = query.status;
      if (query?.severity && query.severity !== 'all') filter.severity = query.severity;
      if (query?.serviceName && query.serviceName !== 'all') filter.serviceName = query.serviceName;
      if (query?.search) {
        filter.$or = [
          { title: { $regex: query.search, $options: 'i' } },
          { id: { $regex: query.search, $options: 'i' } },
          { serviceName: { $regex: query.search, $options: 'i' } },
        ];
      }

      const col = this.db.collection<Incident>('incidents');
      const total = await col.countDocuments(filter);
      const incidents = await col
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      return {
        incidents,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    // In-memory fallback
    let list = Array.from(this.memIncidents.values());
    if (query?.status && query.status !== 'all') list = list.filter(i => i.status === query.status);
    if (query?.severity && query.severity !== 'all') list = list.filter(i => i.severity === query.severity);
    if (query?.serviceName && query.serviceName !== 'all') list = list.filter(i => i.serviceName === query.serviceName);
    if (query?.search) {
      const q = query.search.toLowerCase();
      list = list.filter(i => 
        i.title.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.serviceName.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = list.length;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return {
      incidents: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async getIncidentById(id: string): Promise<Incident | null> {
    if (this.isConnected && this.db) {
      const col = this.db.collection<Incident>('incidents');
      return await col.findOne({ id });
    }
    return this.memIncidents.get(id) || null;
  }

  public async saveIncident(incident: Incident): Promise<Incident> {
    incident.updatedAt = new Date().toISOString();

    if (this.isConnected && this.db) {
      const col = this.db.collection<Incident>('incidents');
      await col.updateOne({ id: incident.id }, { $set: incident }, { upsert: true });
      return incident;
    }

    this.memIncidents.set(incident.id, JSON.parse(JSON.stringify(incident)));
    return incident;
  }

  // --- PostMortem CRUD ---

  public async getPostMortemByIncidentId(incidentId: string): Promise<PostMortem | null> {
    if (this.isConnected && this.db) {
      const col = this.db.collection<PostMortem>('postmortems');
      return await col.findOne({ incidentId });
    }
    return this.memPostMortems.get(incidentId) || null;
  }

  public async savePostMortem(postMortem: PostMortem): Promise<PostMortem> {
    if (this.isConnected && this.db) {
      const col = this.db.collection<PostMortem>('postmortems');
      await col.updateOne({ incidentId: postMortem.incidentId }, { $set: postMortem }, { upsert: true });
      return postMortem;
    }

    this.memPostMortems.set(postMortem.incidentId, JSON.parse(JSON.stringify(postMortem)));
    return postMortem;
  }
}

export const dbManager = new DatabaseManager();
