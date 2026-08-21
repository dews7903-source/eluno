import express from "express";
import cors from "cors";
import path from "path";

interface WorkspaceData {
  orgId: string;
  orgName: string;
  board: any;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    avatar?: string;
    lastSeen: string;
    isOnline: boolean;
  }>;
  messages: Array<any>;
  updatedAt: string;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// In-memory persistent online workspaces store
const workspaces: Map<string, WorkspaceData> = new Map();

// Initialize default Global Workspace
workspaces.set("ORG-GLOBAL", {
  orgId: "ORG-GLOBAL",
  orgName: "Global Marketing Workspace",
  board: null,
  members: [
    {
      id: "MEMBER-1",
      name: "Alex Rivera",
      email: "alex@globalworkspace.io",
      role: "Admin",
      department: "Marketing & Growth",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      lastSeen: new Date().toISOString(),
      isOnline: true,
    },
  ],
  messages: [
    {
      id: "msg-welcome",
      authorName: "System",
      authorRole: "System Admin",
      content: "Welcome to the online workspace! Share your Workspace Code or Link with teammates to collaborate on this board in real time.",
      timestamp: new Date().toISOString(),
      likes: 1,
      type: "announcement",
      priority: "normal",
      likedBy: [],
      replies: [],
    },
  ],
  updatedAt: new Date().toISOString(),
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), totalWorkspaces: workspaces.size });
});

// List or search public/recent workspaces
app.get("/api/workspaces", (req, res) => {
  const list = Array.from(workspaces.values()).map((w) => ({
    orgId: w.orgId,
    orgName: w.orgName,
    memberCount: w.members.length,
    onlineCount: w.members.filter((m) => m.isOnline).length,
    updatedAt: w.updatedAt,
    hasBoard: !!w.board,
  }));
  res.json(list);
});

// Get or auto-provision a workspace by orgId
app.get("/api/workspaces/:orgId", (req, res) => {
  const orgId = req.params.orgId.toUpperCase().trim();
  let ws = workspaces.get(orgId);
  if (!ws) {
    // Create new workspace automatically if not present
    ws = {
      orgId,
      orgName: `${orgId} Team Workspace`,
      board: null,
      members: [],
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    workspaces.set(orgId, ws);
  }
  res.json(ws);
});

// Save or sync board data to workspace
app.post("/api/workspaces/:orgId/board", (req, res) => {
  const orgId = req.params.orgId.toUpperCase().trim();
  const { board, user } = req.body;

  let ws = workspaces.get(orgId);
  if (!ws) {
    ws = {
      orgId,
      orgName: `${orgId} Team Workspace`,
      board: board || null,
      members: [],
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    workspaces.set(orgId, ws);
  } else {
    if (board) {
      ws.board = board;
    }
    ws.updatedAt = new Date().toISOString();
  }

  // Update member activity
  if (user && user.email) {
    const existingIndex = ws.members.findIndex(
      (m) => m.email?.toLowerCase() === user.email.toLowerCase() || m.id === user.uid
    );
    const memberObj = {
      id: user.uid || `MEMBER-${Date.now()}`,
      name: user.displayName || user.name || "Colleague",
      email: user.email,
      role: user.role || "Member",
      department: user.department || "Marketing",
      avatar: user.photoURL || user.avatar,
      lastSeen: new Date().toISOString(),
      isOnline: true,
    };
    if (existingIndex >= 0) {
      ws.members[existingIndex] = { ...ws.members[existingIndex], ...memberObj, isOnline: true };
    } else {
      ws.members.push(memberObj);
    }
  }

  res.json({ success: true, workspace: ws });
});

// Join / check in member to workspace
app.post("/api/workspaces/:orgId/login", (req, res) => {
  const orgId = req.params.orgId.toUpperCase().trim();
  const { user, orgName } = req.body;

  let ws = workspaces.get(orgId);
  if (!ws) {
    ws = {
      orgId,
      orgName: orgName || `${orgId} Workspace`,
      board: null,
      members: [],
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    workspaces.set(orgId, ws);
  } else if (orgName && ws.orgName !== orgName) {
    ws.orgName = orgName;
  }

  const memberId = user?.uid || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
  const memberObj = {
    id: memberId,
    name: user?.displayName || user?.name || "Team Member",
    email: user?.email || `${memberId.toLowerCase()}@workspace.local`,
    role: user?.role || "Member",
    department: user?.department || "General",
    avatar: user?.photoURL || user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.displayName || memberId)}`,
    lastSeen: new Date().toISOString(),
    isOnline: true,
  };

  const existingIndex = ws.members.findIndex(
    (m) => m.email?.toLowerCase() === memberObj.email.toLowerCase() || m.id === memberObj.id
  );

  if (existingIndex >= 0) {
    ws.members[existingIndex] = {
      ...ws.members[existingIndex],
      ...memberObj,
      isOnline: true,
      lastSeen: new Date().toISOString(),
    };
  } else {
    ws.members.push(memberObj);
  }

  ws.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    user: memberObj,
    workspace: ws,
  });
});

// Post an announcement or message in workspace
app.post("/api/workspaces/:orgId/messages", (req, res) => {
  const orgId = req.params.orgId.toUpperCase().trim();
  const { message } = req.body;

  let ws = workspaces.get(orgId);
  if (!ws) {
    ws = {
      orgId,
      orgName: `${orgId} Team Workspace`,
      board: null,
      members: [],
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    workspaces.set(orgId, ws);
  }

  const newMsg = {
    id: message.id || `msg-${Date.now()}`,
    authorName: message.authorName || "Team Member",
    authorRole: message.authorRole || "Member",
    authorEmail: message.authorEmail,
    authorAvatar: message.authorAvatar,
    content: message.content || "",
    timestamp: new Date().toISOString(),
    likes: 0,
    type: message.type || "announcement",
    priority: message.priority || "normal",
    campaignId: message.campaignId,
    campaignTitle: message.campaignTitle,
    tags: message.tags || [],
    likedBy: [],
    replies: [],
  };

  ws.messages.unshift(newMsg);
  ws.updatedAt = new Date().toISOString();

  res.json({ success: true, message: newMsg, totalMessages: ws.messages.length });
});

// Vite middleware & Static fallback
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SheetBoard Online Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
