type Campaign = { id: string; organization_id: string }
export function pinCollectionContext(homeOrganizationId: string, homeRole: string, selected: string | undefined, assigned: Campaign[]) {
  const campaign = assigned.find(row => row.id === selected)
  const delegated = !!campaign && campaign.organization_id !== homeOrganizationId
  return {
    organizationId: delegated ? campaign.organization_id : homeOrganizationId,
    role: delegated ? 'viewer' : homeRole,
    delegated,
    campaignIds: delegated ? assigned.filter(row => row.organization_id === campaign.organization_id).map(row => row.id) : null,
  }
}
