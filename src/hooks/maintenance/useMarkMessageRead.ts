import { useMutation, useQueryClient } from '@tanstack/react-query';

async function markRead(id: string) {
  await fetch(`/api/maintenance/messages/${id}/read`, { method: 'PATCH' });
}

export function useMarkMessageRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['maintenance-messages'] });
    },
  });
}
