import { EmployeeAuth, UserOrgProfile } from '../types';
import { getConnectedOrgMembers, addOrgMember, saveConnectedOrgMembers } from './orgMessageService';

const STORAGE_EMPLOYEE_AUTH_KEY = 'sheetboard_employee_auth_v1';
const STORAGE_ORG_REGISTRY_KEY = 'sheetboard_org_employees_registry_v1';

export interface RegisteredEmployee {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  orgId: string;
  orgName: string;
  department: string;
  role: string;
  avatar: string;
  status?: 'online' | 'busy' | 'away' | 'offline';
  isRegistered?: boolean;
}

export const DEMO_EMPLOYEES: RegisteredEmployee[] = [
  {
    employeeId: 'EMP-1082',
    employeeName: 'Alex Rivera',
    employeeEmail: 'alex.rivera@organization.internal',
    orgId: 'ORG-MARKETING-9021',
    orgName: 'Global Marketing & Operations',
    department: 'Marketing & Strategy',
    role: 'Campaign Operations Lead',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexRivera',
    status: 'online',
  },
  {
    employeeId: 'EMP-1083',
    employeeName: 'Sarah Jenkins',
    employeeEmail: 'sarah.jenkins@organization.internal',
    orgId: 'ORG-MARKETING-9021',
    orgName: 'Global Marketing & Operations',
    department: 'Brand Design',
    role: 'Creative & Brand Director',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahJenkins',
    status: 'online',
  },
  {
    employeeId: 'EMP-1084',
    employeeName: 'David Chen',
    employeeEmail: 'david.chen@organization.internal',
    orgId: 'ORG-MARKETING-9021',
    orgName: 'Global Marketing & Operations',
    department: 'Business Intelligence',
    role: 'Principal Data Analyst',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DavidChen',
    status: 'busy',
  },
  {
    employeeId: 'EMP-1085',
    employeeName: 'Elena Rostova',
    employeeEmail: 'elena.rostova@organization.internal',
    orgId: 'ORG-GROWTH-4040',
    orgName: 'User Growth & Media Group',
    department: 'User Acquisition',
    role: 'Growth & Media Strategist',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ElenaRostova',
    status: 'online',
  },
  {
    employeeId: 'EMP-1086',
    employeeName: 'Marcus Vance',
    employeeEmail: 'marcus.vance@organization.internal',
    orgId: 'ORG-GROWTH-4040',
    orgName: 'User Growth & Media Group',
    department: 'Paid Media Ops',
    role: 'PPC & Ad Tech Specialist',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusVance',
    status: 'away',
  },
];

export function getCustomRegisteredEmployees(): RegisteredEmployee[] {
  try {
    const saved = localStorage.getItem(STORAGE_ORG_REGISTRY_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Error loading custom registered employees:', err);
  }
  return [];
}

export function saveCustomRegisteredEmployee(emp: RegisteredEmployee): void {
  try {
    const existing = getCustomRegisteredEmployees();
    const filtered = existing.filter(
      (e) => !(e.employeeId === emp.employeeId && e.orgId === emp.orgId)
    );
    const updated = [emp, ...filtered];
    localStorage.setItem(STORAGE_ORG_REGISTRY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving registered employee:', err);
  }
}

/**
 * Returns all registered and connected employees for a given Organization ID.
 * Merges demo employees, custom created employees, and org members.
 */
export function getEmployeesForOrg(orgId: string): RegisteredEmployee[] {
  const cleanOrgId = orgId.trim().toUpperCase() || 'DEFAULT-ORG';
  const customList = getCustomRegisteredEmployees().filter(
    (e) => e.orgId.toUpperCase() === cleanOrgId
  );
  const demoList = DEMO_EMPLOYEES.filter(
    (e) => e.orgId.toUpperCase() === cleanOrgId
  );

  // Also include members from connected org members
  const orgMembers = getConnectedOrgMembers(cleanOrgId);
  const memberAsEmployees: RegisteredEmployee[] = orgMembers.map((m, idx) => ({
    employeeId: m.id.startsWith('EMP-') ? m.id : `EMP-${1100 + idx}`,
    employeeName: m.name,
    employeeEmail: m.email,
    orgId: cleanOrgId,
    orgName: `${cleanOrgId} Workspace`,
    department: m.department || 'Operations',
    role: m.role || 'Team Member',
    avatar: m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name)}`,
    status: m.status,
  }));

  // Deduplicate by employeeName or email or employeeId
  const combined = [...customList, ...demoList, ...memberAsEmployees];
  const seen = new Set<string>();
  const result: RegisteredEmployee[] = [];

  for (const emp of combined) {
    const key = `${emp.orgId.toUpperCase()}::${emp.employeeName.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(emp);
    }
  }

  return result;
}

/**
 * Returns a list of all distinct Organization IDs and their counts/names.
 */
export function getAllKnownOrganizations(): Array<{ orgId: string; orgName: string; employeeCount: number }> {
  const allEmployees = [...DEMO_EMPLOYEES, ...getCustomRegisteredEmployees()];
  const orgMap = new Map<string, { orgName: string; count: number }>();

  for (const emp of allEmployees) {
    const cleanId = emp.orgId.trim().toUpperCase();
    if (!orgMap.has(cleanId)) {
      orgMap.set(cleanId, { orgName: emp.orgName || `${cleanId} Workspace`, count: 0 });
    }
    orgMap.get(cleanId)!.count += 1;
  }

  return Array.from(orgMap.entries()).map(([orgId, data]) => ({
    orgId,
    orgName: data.orgName,
    employeeCount: data.count,
  }));
}

/**
 * Global search for people across all organizations or within a specific Organization ID.
 */
export function searchEmployees(
  query: string,
  targetOrgId?: string
): RegisteredEmployee[] {
  const cleanQuery = query.trim().toLowerCase();
  let pool: RegisteredEmployee[] = [];

  if (targetOrgId && targetOrgId.trim()) {
    pool = getEmployeesForOrg(targetOrgId);
  } else {
    const allCustom = getCustomRegisteredEmployees();
    const seen = new Set<string>();
    for (const emp of [...allCustom, ...DEMO_EMPLOYEES]) {
      const key = `${emp.orgId.toUpperCase()}::${emp.employeeName.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        pool.push(emp);
      }
    }
  }

  if (!cleanQuery) return pool;

  return pool.filter((emp) =>
    emp.employeeName.toLowerCase().includes(cleanQuery) ||
    emp.role.toLowerCase().includes(cleanQuery) ||
    emp.department.toLowerCase().includes(cleanQuery) ||
    emp.employeeId.toLowerCase().includes(cleanQuery) ||
    emp.employeeEmail.toLowerCase().includes(cleanQuery) ||
    emp.orgId.toLowerCase().includes(cleanQuery)
  );
}

export function getStoredEmployeeAuth(): EmployeeAuth | null {
  try {
    const saved = localStorage.getItem(STORAGE_EMPLOYEE_AUTH_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.isLoggedIn) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading employee auth:', err);
  }
  return null;
}

export function saveStoredEmployeeAuth(auth: EmployeeAuth | null): void {
  try {
    if (auth && auth.isLoggedIn) {
      localStorage.setItem(STORAGE_EMPLOYEE_AUTH_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_EMPLOYEE_AUTH_KEY);
    }
  } catch (err) {
    console.error('Error saving employee auth:', err);
  }
}

export function createEmployeeSession(data: {
  employeeId?: string;
  employeeName: string;
  employeeEmail?: string;
  orgId: string;
  orgName?: string;
  department?: string;
  role?: string;
  avatar?: string;
}): EmployeeAuth {
  const cleanOrgId = data.orgId.trim().toUpperCase() || 'ORG-DEFAULT-2026';
  const cleanEmpId =
    data.employeeId?.trim().toUpperCase() ||
    `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

  const avatar =
    data.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      data.employeeName.trim() || 'Employee'
    )}`;

  const email =
    data.employeeEmail?.trim() ||
    `${data.employeeName.toLowerCase().replace(/\s+/g, '.')}@${cleanOrgId.toLowerCase()}.internal`;

  const auth: EmployeeAuth = {
    isLoggedIn: true,
    employeeId: cleanEmpId,
    employeeName: data.employeeName.trim() || 'Employee',
    employeeEmail: email,
    orgId: cleanOrgId,
    orgName: data.orgName?.trim() || `${cleanOrgId} Organization`,
    department: data.department?.trim() || 'Operations',
    role: data.role?.trim() || 'Team Member',
    avatar,
    loginTime: new Date().toISOString(),
  };

  // 1. Save active auth
  saveStoredEmployeeAuth(auth);

  // 2. Save in Org Registry so others can find this person under this Org ID
  saveCustomRegisteredEmployee({
    employeeId: auth.employeeId,
    employeeName: auth.employeeName,
    employeeEmail: auth.employeeEmail,
    orgId: auth.orgId,
    orgName: auth.orgName,
    department: auth.department,
    role: auth.role,
    avatar: auth.avatar,
    status: 'online',
    isRegistered: true,
  });

  // 3. Sync to Org Members roster
  try {
    const existingMembers = getConnectedOrgMembers(cleanOrgId);
    const exists = existingMembers.some(
      (m) => m.name.toLowerCase() === auth.employeeName.toLowerCase() || m.email.toLowerCase() === auth.employeeEmail.toLowerCase()
    );
    if (!exists) {
      addOrgMember(cleanOrgId, {
        name: auth.employeeName,
        role: auth.role,
        department: auth.department,
        email: auth.employeeEmail,
        status: 'online',
        avatar: auth.avatar,
      });
    }
  } catch (err) {
    console.error('Error syncing org member on login:', err);
  }

  return auth;
}

export function employeeToOrgProfile(auth: EmployeeAuth): UserOrgProfile {
  return {
    orgId: auth.orgId,
    orgName: auth.orgName,
    userId: auth.employeeId,
    userName: auth.employeeName,
    userRole: auth.role,
    userDept: auth.department,
    userEmail: auth.employeeEmail,
    userAvatar: auth.avatar,
  };
}
