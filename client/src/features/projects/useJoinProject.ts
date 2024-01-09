import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { joinProject as joinProjectAPI } from '../../serverActions/projectsAPI';

export const useJoinProject = () => {
  const navigate = useNavigate();
  const { projectId } = useParams() as { projectId: string };

  const {
    mutate: joinProject,
    status,
    error,
  } = useMutation({
    mutationFn: () => joinProjectAPI(projectId),
    onSuccess: () => {
      navigate(`/project/${projectId}/home`);
      toast.success('Welcome! You are now a member');
    },
    onError: err => toast.error(err.message),
  });

  return { joinProject, isLoading: status === 'pending', error };
};
