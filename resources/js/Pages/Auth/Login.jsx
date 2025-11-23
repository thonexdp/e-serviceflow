import { useEffect } from 'react';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

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
            <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
                <div className="w-full max-w-md">
                    {/* Logo and Brand */}
                    <div className="text-center mb-8">
                        <div className="inline-flex w-20 h-20 bg-white rounded-2xl items-center justify-center mb-4 shadow-md border border-gray-200">
                            <img src="/images/logo.jpg" alt="RC PrintShoppe" className="w-12 h-12" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">RC PrintShoppe</h1>
                        <p className="text-gray-600">Professional Printing Solutions</p>
                    </div>

                    {/* Login Card */}
                    <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Welcome Back</h2>
                            <p className="text-gray-600 text-sm">Sign in to your account to continue</p>
                        </div>

                        {status && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-700 font-medium">{status}</p>
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <InputLabel
                                    htmlFor="email"
                                    value="Email Address"
                                    className="text-gray-700 font-medium mb-2"
                                />
                                <TextInput
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                                    autoComplete="username"
                                    isFocused={true}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="you@example.com"
                                />
                                <InputError message={errors.email} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="password"
                                    value="Password"
                                    className="text-gray-700 font-medium mb-2"
                                />
                                <TextInput
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                                    autoComplete="current-password"
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Enter your password"
                                />
                                <InputError message={errors.password} className="mt-2" />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center cursor-pointer">
                                    <Checkbox
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Remember me</span>
                                </label>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Forgot password?
                                    </Link>
                                )}
                            </div>

                            <PrimaryButton
                                className="w-full justify-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-150"
                                disabled={processing}
                            >
                                {processing ? 'Signing in...' : 'Sign In'}
                            </PrimaryButton>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="mt-6 text-center text-sm text-gray-500">
                        © 2025 RC PrintShoppe. All rights reserved.
                    </p>
                </div>
            </div>
        </>
    );
}