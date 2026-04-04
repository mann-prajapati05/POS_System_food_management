import api from './api';

export async function getFloorsAndTables() {
  const { data } = await api.get('/staff/floors-tables');
  return data.floors || [];
}
