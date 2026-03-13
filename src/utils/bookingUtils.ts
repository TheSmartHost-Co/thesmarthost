export function isReservedName(name: string | null | undefined): boolean {
  return name?.trim().toLowerCase() === 'reserved'
}
