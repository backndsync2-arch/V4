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
      }
      // Navigation will be handled by App.tsx routing
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || 'Invalid credentials';
      toast.error(errorMessage);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0a0a0a] p-4 sm:p-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1db954]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#1ed760]/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        {onBackToLanding && (
          <Button
            variant="ghost"
            onClick={onBackToLanding}
            className="absolute top-4 left-4 gap-2 z-10 bg-[#1a1a1a]/80 backdrop-blur-sm hover:bg-[#2a2a2a] text-white border-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        
        <Card className="w-full max-w-md shadow-2xl border-white/10 bg-[#1a1a1a] backdrop-blur-xl relative z-10">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-2xl shadow-lg shadow-[#1db954]/30">
                <img src={logoImage} alt="sync2gear" className="h-16 w-16" />
              </div>
            </div>
            <CardTitle className="text-3xl text-center font-bold text-white">
              sync2gear
            </CardTitle>
            <CardDescription className="text-center text-base text-gray-400 mt-2">
              Sign in to manage your business audio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-[#2a2a2a] border-white/10 text-white placeholder:text-gray-500 focus-visible:border-[#1db954] focus-visible:ring-[#1db954]/20"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-xs text-[#1db954] hover:text-[#1ed760] h-auto py-0"
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
                  className="h-11 bg-[#2a2a2a] border-white/10 text-white placeholder:text-gray-500 focus-visible:border-[#1db954] focus-visible:ring-[#1db954]/20"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] text-base font-semibold shadow-lg shadow-[#1db954]/30 transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </Button>
            </form>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
              <Shield className="h-4 w-4 text-[#1db954]" />
              <span>Secured with enterprise-grade encryption</span>
            </div>
            
            {/* Quick Access Credentials */}
            <div className="mt-6 p-4 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-lg border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-[#1db954]" />
                <p className="font-semibold text-sm text-white">Quick Access</p>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="bg-[#1a1a1a] p-3 rounded-lg border border-white/10 hover:border-[#1db954]/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium text-xs">Admin Account</span>
                    <span className="text-xs text-[#1db954] bg-[#1db954]/20 px-2 py-0.5 rounded font-semibold">Active</span>
                  </div>
                  <div className="font-mono text-xs text-gray-400 break-all mb-2">admin@sync2gear.com</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmail('admin@sync2gear.com');
                        toast.success('Email filled');
                      }}
                      className="h-7 text-xs border-white/10 text-gray-300 hover:bg-[#1db954]/10 hover:text-[#1db954] hover:border-[#1db954]/30"
                    >
                      Use Email
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText('Admin@Sync2Gear2025!');
                        toast.success('Password copied');
                      }}
                      className="h-7 text-xs border-white/10 text-gray-300 hover:bg-[#1db954]/10 hover:text-[#1db954] hover:border-[#1db954]/30"
                    >
                      Copy Password
                    </Button>
                  </div>
                </div>
                <div className="bg-[#1a1a1a] p-3 rounded-lg border border-white/10 hover:border-[#1db954]/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium text-xs">Client Account</span>
                    <span className="text-xs text-[#1db954] bg-[#1db954]/20 px-2 py-0.5 rounded font-semibold">Active</span>
                  </div>
                  <div className="font-mono text-xs text-gray-400 break-all mb-2">client1@example.com</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmail('client1@example.com');
                        toast.success('Email filled');
                      }}
                      className="h-7 text-xs border-white/10 text-gray-300 hover:bg-[#1db954]/10 hover:text-[#1db954] hover:border-[#1db954]/30"
                    >
                      Use Email
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText('Client@Example2025!');
                        toast.success('Password copied');
                      }}
                      className="h-7 text-xs border-white/10 text-gray-300 hover:bg-[#1db954]/10 hover:text-[#1db954] hover:border-[#1db954]/30"
                    >
                      Copy Password
                    </Button>
                  </div>
                </div>
                <div className="bg-[#1a1a1a] p-3 rounded-lg border border-white/10 hover:border-[#1db954]/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium text-xs">Floor User</span>
                    <span className="text-xs text-[#1db954] bg-[#1db954]/20 px-2 py-0.5 rounded font-semibold">Active</span>
                  </div>
                  <div className="font-mono text-xs text-gray-400 break-all mb-2">floor1@downtowncoffee.com</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmail('floor1@downtowncoffee.com');
                        toast.success('Email filled');
                      }}
                      className="h-7 text-xs border-white/10 text-gray-300 hover:bg-[#1db954]/10 hover:text-[#1db954] hover:border-[#1db954]/30"
                    >
                      Use Email
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText('Floor@Downtown2025!');
                        toast.success('Password copied');
                      }}
                      className="h-7 text-xs border-white/10 text-gray-300 hover:bg-[#1db954]/10 hover:text-[#1db954] hover:border-[#1db954]/30"
                    >
                      Copy Password
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-white/10">
                Quick access credentials for testing. All accounts require proper authentication.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Mail className="h-5 w-5 text-[#1db954]" />
              Reset Your Password
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter your email address and we'll send you a link to reset your password
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resetEmail" className="text-gray-300">Email Address</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="name@business.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="bg-[#2a2a2a] border-white/10 text-white placeholder:text-gray-500 focus-visible:border-[#1db954] focus-visible:ring-[#1db954]/20"
              />
            </div>

            <div className="bg-[#1db954]/10 border border-[#1db954]/30 rounded-lg p-4">
              <p className="text-sm text-[#1db954] space-y-1">
                <div>✓ Password reset link expires in 1 hour</div>
                <div>✓ Check your spam folder if you don't see it</div>
                <div>✓ Contact support if you need help</div>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setResetPasswordOpen(false)} 
              className="border-white/10 text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordReset} 
              className="bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] text-white"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
