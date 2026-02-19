export function warehouseIconByType(name: string, code: string): string {
  const key = `${code} ${name}`.toLowerCase();
  if (key.includes('hammadde') || key.includes('raw')) return 'pi pi-circle-fill';
  if (key.includes('yedek') || key.includes('spare')) return 'pi pi-cog';
  if (key.includes('ürün') || key.includes('urun') || key.includes('product') || key.includes('finished')) {
    return 'pi pi-box';
  }
  return 'pi pi-tag';
}
