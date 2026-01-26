import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { ArrowLeft, Mail, Shield } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from '@/assets/77e47cfb36e9b1e5ffd3ce20b4f723cd8ab924e0.png';

interface SignInEnhancedProps {
  onBackToLanding?: () => void;
}

export function SignInEnhanced({ onBackToLanding }: SignInEnhancedProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!email || !email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    
    if (!password || !password.trim()) {
      toast.error('Please enter your password');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signIn(email.trim(), password);
      toast.success('Signed in successfully');
      // Redirect to dashboard after successful login
      if (onBackToLanding) {
        onBackToLanding();
      } else {
        // If no callback, redirect via hash
        window.location.hash = 'dashboard';
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || 'Invalid credentials';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // In production: Use Firebase Auth with Google provider
      // await signInWithPopup(auth, googleProvider);
      toast.success('Google Sign-In coming soon!', {
        description: 'This will use Firebase Authentication with Google OAuth',
      });
    } catch (error) {
      toast.error('Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setIsLoading(true);
    try {
      // In production: Use Firebase Auth with Microsoft provider
      // await signInWithPopup(auth, microsoftProvider);
      toast.success('Microsoft Sign-In coming soon!', {
        description: 'This will use Firebase Authentication with Azure AD',
      });
    } catch (error) {
      toast.error('Microsoft sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = () => {
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    // In production: Use Firebase Auth sendPasswordResetEmail
    // await sendPasswordResetEmail(auth, resetEmail);
    toast.success('Password reset email sent!', {
      description: `Check ${resetEmail} for reset instructions`,
    });
    
    setResetPasswordOpen(false);
    setResetEmail('');
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4">
        {onBackToLanding && (
          <Button
            variant="ghost"
            onClick={onBackToLanding}
            className="absolute top-4 left-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <img src={logoImage} alt="sync2gear" className="h-20 w-20" />
            </div>
            <CardTitle className="text-3xl text-center font-bold">sync2gear</CardTitle>
            <CardDescription className="text-center text-base">
              Sign in to manage your business audio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* OAuth Providers */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 gap-2 border-2"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google Workspace
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 gap-2 border-2"
                onClick={handleMicrosoftSignIn}
                disabled={isLoading}
              >
                <svg className="h-5 w-5" viewBox="0 0 23 23">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Continue with Microsoft 365
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-xs text-blue-600"
                    onClick={() => setResetPasswordOpen(true)}
                  >
                    Forgot password?
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-base font-semibold" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Secured with enterprise-grade encryption</span>
            </div>
            
            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-semibold text-sm mb-3 text-slate-800">Demo Credentials:</p>
              <div className="space-y-2 text-sm">
                <div className="bg-white p-3 rounded border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-700 font-medium">Admin:</span>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded font-semibold">Password Required</span>
                  </div>
                  <div className="font-mono text-xs text-slate-800 break-all mb-2">admin@sync2gear.com</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-600">Password:</span>
                    <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded border border-slate-300 text-slate-800 break-all">
                      Admin@Sync2Gear2025!
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('Admin@Sync2Gear2025!');
                        toast.success('Password copied to clipboard');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-700 font-medium">Client:</span>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded font-semibold">Password Required</span>
                  </div>
                  <div className="font-mono text-xs text-slate-800 break-all mb-2">client1@example.com</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-600">Password:</span>
                    <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded border border-slate-300 text-slate-800 break-all">
                      Client@Example2025!
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('Client@Example2025!');
                        toast.success('Password copied to clipboard');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-700 font-medium">Floor User:</span>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded font-semibold">Password Required</span>
                  </div>
                  <div className="font-mono text-xs text-slate-800 break-all mb-2">floor1@downtowncoffee.com</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-600">Password:</span>
                    <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded border border-slate-300 text-slate-800 break-all">
                      Floor@Downtown2025!
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('Floor@Downtown2025!');
                        toast.success('Password copied to clipboard');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-blue-200">
                🔒 All accounts require proper password authentication. Click "Copy" to copy passwords to clipboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Reset Your Password
            </DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resetEmail">Email Address</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="name@business.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ✓ Password reset link expires in 1 hour<br />
                ✓ Check your spam folder if you don't see it<br />
                ✓ Contact support if you need help
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordReset} className="bg-blue-600 hover:bg-blue-700">
              <Mail className="h-4 w-4 mr-2" />
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
