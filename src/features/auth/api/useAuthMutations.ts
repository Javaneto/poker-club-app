import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestPasswordReset, signIn, signOut, signUp, updatePassword } from './authApi';

export function useSignIn() {
  return useMutation({ mutationFn: signIn });
}

export function useSignUp() {
  return useMutation({ mutationFn: signUp });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    // Nada do usuário anterior pode ficar em cache.
    onSettled: () => queryClient.clear(),
  });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useUpdatePassword() {
  return useMutation({ mutationFn: updatePassword });
}
