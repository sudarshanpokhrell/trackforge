import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { type JSX, type SVGProps, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Link, useRouter, useSearch } from '@tanstack/react-router';
import { getErrorMessage } from '@/lib/api';
import {  useLogin } from '@/hooks/auth';


export function safeRedirect(redirect: string | undefined) {
  return redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/"
}

const GoogleIcon = (
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>
) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
  </svg>
);

type LoginValues = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);
  const login = useLogin();
  const router = useRouter();
  const { redirect } = useSearch({ from: '/_auth/login' });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      const { user } = await login.mutateAsync(values);
      toast.success(`Welcome ${user.name}`);
      // redirect is a full href (path + search), so navigate by href rather than `to`.
      await router.navigate({ href: safeRedirect(redirect), replace: true });
    } catch (error) {
      setError('root', { message: getErrorMessage(error) });
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-balance font-semibold text-3xl">Welcome back</h1>
          <p className="text-pretty text-muted-foreground">
            Sign in to access to your dashboard and projects.
          </p>
        </div>

        <div className="space-y-5">
          <Button
            className="w-full justify-center gap-2 h-10"
            disabled={isSubmitting}
            type="button"
            variant="outline"
          >
            <GoogleIcon className="h-4 w-4" />
            Sign in with Google
          </Button>

          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-sm">
              or sign in with email
            </span>
            <Separator className="flex-1" />
          </div>

          <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-2.5">
                  <Input
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    aria-invalid={errors.email ? true : undefined}
                    autoComplete="email"
                    className="h-10"
                    id="email"
                    placeholder="demo@trackforge.app"
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
                  <p className="mt-2 text-destructive text-sm" id="email-error">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a className="text-primary text-sm hover:underline" href="#">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative mt-2.5">
                  <Input
                    aria-describedby={
                      errors.password ? 'password-error' : undefined
                    }
                    aria-invalid={errors.password ? true : undefined}
                    autoComplete="current-password"
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
                      <EyeOff aria-hidden="true" size={16} />
                    ) : (
                      <Eye aria-hidden="true" size={16} />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    className="mt-2 text-destructive text-sm"
                    id="password-error"
                  >
                    {errors.password.message}
                  </p>
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
              {isSubmitting ? 'Signing in…' : 'Sign in'}
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            No account?{' '}
            <Link className="font-medium text-primary hover:underline" to="/register">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
