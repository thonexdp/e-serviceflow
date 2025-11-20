import { useEffect } from 'react';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';
// import { Printer } from 'lucide-react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'));
    };

    return (
        <>
            <Head title="Log in" />
            <div className="min-h-screen flex">
                {/* Left Side - Branding */}
                <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-12 flex-col justify-center items-center relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute top-0 left-0 w-72 h-72 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full translate-x-1/3 translate-y-1/3"></div>
                    
                    <div className="relative z-10 text-center">
                        {/* Logo */}
                        <div className="flex justify-center mb-8">
                            <div className="w-32 h-32 bg-white rounded-3xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                                {/* <Printer className="w-16 h-16 text-indigo-600" strokeWidth={2} /> */}
                                <img src="/images/logo.jpg" alt="RC PrintShoppe" className="w-16 h-16" />
                            </div>
                        </div>
                        
                        {/* System Name */}
                        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
                            RC PrintShoppe
                        </h1>
                        <p className="text-xl text-indigo-100 max-w-md mx-auto">
                            Your trusted partner for professional printing solutions
                        </p>
                        
                        {/* Decorative elements */}
                        {/* <div className="mt-12 flex justify-center gap-2">
                            <div className="w-3 h-3 bg-white rounded-full opacity-60"></div>
                            <div className="w-3 h-3 bg-white rounded-full opacity-40"></div>
                            <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                        </div> */}
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
                    <div className="w-full max-w-md">
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-8">
                            <div className="inline-flex w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
                                {/* <Printer className="w-10 h-10 text-white" strokeWidth={2} /> */}
                                <img src="/images/logo.jpg" alt="RC PrintShoppe" className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800">RC PrintShoppe</h2>
                        </div>

                        {/* Login Card */}
                        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h3>
                                <p className="text-gray-600">Please sign in to your account</p>
                            </div>

                            {status && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-600 font-medium">{status}</p>
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-6">
                                <div>
                                    <InputLabel htmlFor="email" value="Email Address" className="text-gray-700 font-medium" />
                                    <TextInput
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        className="mt-2 block w-full px-4 py-3 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                        autoComplete="username"
                                        isFocused={true}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="you@example.com"
                                    />
                                    <InputError message={errors.email} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="password" value="Password" className="text-gray-700 font-medium" />
                                    <TextInput
                                        id="password"
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        className="mt-2 block w-full px-4 py-3 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                        autoComplete="current-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="Enter your password"
                                    />
                                    <InputError message={errors.password} className="mt-2" />
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="flex items-center cursor-pointer">
                                        <Checkbox
                                            name="remember"
                                            checked={data.remember}
                                            onChange={(e) => setData('remember', e.target.checked)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-600 font-medium">Remember me</span>
                                    </label>

                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                                        >
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>

                                <PrimaryButton 
                                    className="w-full justify-center py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200" 
                                    disabled={processing}
                                >
                                    {processing ? 'Signing in...' : 'Sign In'}
                                </PrimaryButton>
                            </form>
                        </div>

                        {/* Footer */}
                        <p className="mt-6 text-center text-sm text-gray-600">
                            © 2025 RC PrintShoppe. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}