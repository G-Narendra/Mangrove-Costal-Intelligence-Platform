export interface Project {
  id: string;
  name: string;
  status: 'Planning' | 'Active' | 'Completed' | 'On Hold';
  blueCarbon: number; // metric tons
  mangroveArea: number; // hectares
  seagrassArea: number; // hectares
  healthScore: number; // 0-100
  fishNurseryScore: number; // 0-100
  communities: string[];
  heritageSites: string[];
  accessStatus: string;
}

export interface Zone {
  id: string;
  name: string;
  type: 'Conservation' | 'Restoration' | 'Community' | 'Heritage';
  area: number;
  threatLevel: 'Low' | 'Medium' | 'High';
}

export interface Alert {
  id: string;
  type: 'Storm Damage' | 'Seagrass Degradation' | 'Nursery Health Decline' | 'Unauthorized Access';
  severity: 'Critical' | 'Warning' | 'Info';
  message: string;
  timestamp: string;
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Al Jubail Mangrove Sanctuary',
    status: 'Active',
    blueCarbon: 12500,
    mangroveArea: 450,
    seagrassArea: 120,
    healthScore: 92,
    fishNurseryScore: 88,
    communities: ['Al Jubail Village', 'East Side Community'],
    heritageSites: ['Ancient Pearling Port'],
    accessStatus: 'Educational Access',
  },
  {
    id: 'p2',
    name: 'Khor Kalba Restoration',
    status: 'Active',
    blueCarbon: 8900,
    mangroveArea: 310,
    seagrassArea: 45,
    healthScore: 78,
    fishNurseryScore: 72,
    communities: ['Kalba Town'],
    heritageSites: ['Sultan bin Ahmed Fort'],
    accessStatus: 'Restricted',
  },
  {
    id: 'p3',
    name: 'Zorah Coastal Corridor',
    status: 'Planning',
    blueCarbon: 2100,
    mangroveArea: 80,
    seagrassArea: 15,
    healthScore: 65,
    fishNurseryScore: 54,
    communities: ['Ajman North'],
    heritageSites: [],
    accessStatus: 'Open',
  },
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'a1',
    type: 'Storm Damage',
    severity: 'Warning',
    message: 'High tide surge detected in Khor Kalba; potential sediment displacement.',
    timestamp: '2 hours ago',
  },
  {
    id: 'a2',
    type: 'Seagrass Degradation',
    severity: 'Critical',
    message: 'Rapid decline in seagrass density observed at Zone Delta-4.',
    timestamp: '5 hours ago',
  },
  {
    id: 'a3',
    type: 'Nursery Health Decline',
    severity: 'Info',
    message: 'Salinity levels rising above optimal thresholds in Sector B.',
    timestamp: '1 day ago',
  },
];

export const KPI_TOTALS = {
  totalBlueCarbon: 23500,
  totalMangroveArea: 840,
  totalSeagrassArea: 180,
  avgEcosystemHealth: 78,
};
