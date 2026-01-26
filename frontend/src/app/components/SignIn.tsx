import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from '@/assets/77e47cfb36e9b1e5ffd3ce20b4f723cd8ab924e0.png';

interface SignInProps {
  onBackToLanding?: () => void;
}

export function SignIn({ onBackToLanding }: SignInProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || 'Invalid credentials';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
            Sign in to manage your music and announcements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="font-semibold text-sm mb-3 text-slate-800">Demo Credentials:</p>
            <div className="space-y-2 text-sm">
              <div className="bg-white p-3 rounded border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-700 font-medium">Admin:</span>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded font-semibold">Password Required</span>
                </div>
                <div className="font-mono text-xs text-slate-800 break-all mb-2">admin@sync2gear.com</div>
                <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-2">
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
  );
}