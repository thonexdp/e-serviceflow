import { useEffect } from 'react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, useForm } from '@inertiajs/react';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('password.store'));
    };

    return (
        <>
            <Head title="Reset Password" />
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

                    {/* Reset Password Card */}
                    <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Reset Password</h2>
                            <p className="text-gray-600 text-sm">
                                Enter your new password below to reset your account password.
                            </p>
                        </div>

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
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="you@example.com"
                                />
                                <InputError message={errors.email} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="password"
                                    value="New Password"
                                    className="text-gray-700 font-medium mb-2"
                                />
                                <TextInput
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                                    autoComplete="new-password"
                                    isFocused={true}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Enter your new password"
                                />
                                <InputError message={errors.password} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="password_confirmation"
                                    value="Confirm Password"
                                    className="text-gray-700 font-medium mb-2"
                                />
                                <TextInput
                                    id="password_confirmation"
                                    type="password"
                                    name="password_confirmation"
                                    value={data.password_confirmation}
                                    className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                                    autoComplete="new-password"
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    placeholder="Confirm your new password"
                                />
                                <InputError message={errors.password_confirmation} className="mt-2" />
                            </div>

                            <PrimaryButton
                                className="w-full justify-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-150"
                                disabled={processing}
                            >
                                {processing ? 'Resetting...' : 'Reset Password'}
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
