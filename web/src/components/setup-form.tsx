import {
  ArrowRight02Icon,
  Loading03Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { getErrorMessage, isApiError } from '@/lib/api';
import { setupQuery, useSetup } from '@/hooks/use-auth';
import type { SetupInput } from '@/types/auth';

export default function SetupForm() {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);
  const { data: status } = useQuery(setupQuery);
  const setup = useSetup();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetupInput>({
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: SetupInput) => {
    try {
      await setup.mutateAsync(values);
      toast.success('Superadmin account created. Please login to continue.');
      await navigate({ to: '/login', replace: true });
    } catch (error) {
      if (isApiError(error, 409)) {
        toast.error('Setup has already been completed.');
        await navigate({ to: '/login', replace: true });
        return;
      }
      setError('root', { message: getErrorMessage(error) });
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="mx-auto w-full max-w-[400px] space-y-6 rounded-2xl border bg-card p-8 shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
        <div className="space-y-2 text-center">
          <img src="/logo.svg" alt="TrackForge" className="mx-auto mb-5 size-10" />
          <h1 className="text-balance text-headline">
            Set up {status?.app_name ?? 'TrackForge'}
          </h1>
          <p className="text-pretty text-body-sm text-ink-subtle">
            Create the superadmin account. You'll use it to add everyone else.
          </p>
        </div>

        <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <div className="relative mt-2.5">
                <Input
                  aria-invalid={errors.name ? true : undefined}
                  autoComplete="name"
                  className="h-10"
                  id="name"
                  placeholder="Sudarshan Pokhrel"
                  type="text"
                  {...register('name', { required: 'Name is required.' })}
                />
              </div>
              {errors.name && (
                <p className="mt-2 text-destructive text-sm">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-2.5">
                <Input
                  aria-invalid={errors.email ? true : undefined}
                  autoComplete="email"
                  className="h-10"
                  id="email"
                  placeholder="admin@trackforge.app"
                  type="email"
                  {...register('email', {
                    required: 'Email is required.',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address.',
                    },
                  })}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-destructive text-sm">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-2.5">
                <Input
                  aria-invalid={errors.password ? true : undefined}
                  autoComplete="new-password"
                  className="h-10 pe-9"
                  id="password"
                  placeholder="Enter your password"
                  type={isVisible ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Password is required.',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters.',
                    },
                  })}
                />
                <button
                  aria-controls="password"
                  aria-label={isVisible ? 'Hide password' : 'Show password'}
                  aria-pressed={isVisible}
                  className="absolute inset-y-0 inset-e-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={toggleVisibility}
                  type="button"
                >
                  {isVisible ? (
                    <HugeiconsIcon icon={ViewOffSlashIcon} aria-hidden="true" size={16} />
                  ) : (
                    <HugeiconsIcon icon={ViewIcon} aria-hidden="true" size={16} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-destructive text-sm">{errors.password.message}</p>
              )}
            </div>
          </div>

          {errors.root && (
            <p
              className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm"
              role="alert"
            >
              {errors.root.message}
            </p>
          )}

          <Button className="w-full h-10" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating account…' : 'Create superadmin'}
            {isSubmitting ? (
              <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />
            ) : (
              <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
