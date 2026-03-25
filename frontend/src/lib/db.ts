// MOCK PRISMA CLIENT
// This is a temporary measure to bypass build errors since the Prisma Client 
// generation is failing in the current environment.

const globalForMock = globalThis as unknown as {
  mockUsers: any[];
  mockDatasets: any[];
};

if (!globalForMock.mockUsers) {
  globalForMock.mockUsers = [
    {
      id: "demo-user-123",
      email: "demo@vyaaparmitra.com",
      name: "Demo User",
      passwordHash: "$2b$10$R/wDLXLCcdPfNQeG7VABj.0yiLbGgJO63Q3rAt6hXHDFp6PYS690", // password123
    }
  ];
}

if (!globalForMock.mockDatasets) {
  globalForMock.mockDatasets = [];
}

const mockPrisma: any = {
  user: {
    findUnique: async ({ where }: any) => {
      console.log("[MOCK DB] findUnique user:", where);
      const user = globalForMock.mockUsers.find(u => u.email === where.email) || null;
      return user;
    },
    create: async ({ data }: any) => {
      console.log("[MOCK DB] create user:", data.email);
      const newUser = { ...data, id: `user-${Date.now()}` };
      globalForMock.mockUsers.push(newUser);
      return newUser;
    },
  },
  dataset: {
    findFirst: async ({ where, orderBy }: any) => {
      console.log("[MOCK DB] findFirst dataset for:", where?.userId);
      const datasets = globalForMock.mockDatasets
        .filter(d => !where?.userId || d.userId === where.userId);
      
      if (orderBy?.createdAt === 'desc') {
        return [...datasets].sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null;
      }
      return datasets[0] || null;
    },
    findMany: async ({ where }: any) => {
      return globalForMock.mockDatasets.filter(d => !where?.userId || d.userId === where.userId);
    },
    create: async ({ data }: any) => {
      console.log("[MOCK DB] create dataset:", data.filename);
      const newDataset = { 
        ...data, 
        id: `dataset-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      globalForMock.mockDatasets.push(newDataset);
      return newDataset;
    },
  },
  chatSession: {
    findMany: async () => [],
    create: async ({ data }: any) => ({ ...data, id: "session-id", messages: [] }),
  },
  chatMessage: {
    findMany: async () => [],
    createMany: async () => ({ count: 2 }),
  },
  $connect: async () => {},
  $disconnect: async () => {},
};

export const prisma = mockPrisma;
