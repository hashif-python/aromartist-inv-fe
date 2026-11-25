import { apiClient } from './client';

// Use the same tenant-scoped endpoint as Category Management.
export async function fetchCategories() {
  const { data } = await apiClient.get('/inventory/categories/');
  const rows = Array.isArray(data) ? [...data] : Array.isArray(data?.results) ? [...data.results] : null;
  if (!Array.isArray(rows)) throw new Error('Invalid category response');
  if (!Array.isArray(data)) {
    let page = 2, next = data.next;
    while (next) {
      const {data: more} = await apiClient.get('/inventory/categories/', {params:{page:page++}});
      if (!Array.isArray(more?.results)) throw new Error('Invalid category page');
      rows.push(...more.results); next = more.next;
    }
  }
  return rows.map(c => ({ ...c, id: String(c.id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
