import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
  const { data, setData, post, processing, errors } = useForm({
    email: ''
  });

  const submit = (e) => {
    e.preventDefault();
    post(route('password.email'));
  };

  return (
    <>
            <Head title="Forgot Password" />
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

                    {/* Forgot Password Card */}
                    <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Forgot Password?</h2>
                            <p className="text-gray-600 text-sm">
                                No problem. Enter your email address and we'll send you a password reset link.
                            </p>
                        </div>

                        {status &&
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-700 font-medium">{status}</p>
                            </div>
            }

                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <InputLabel
                  htmlFor="email"
                  value="Email Address"
                  className="text-gray-700 font-medium mb-2" />

                                <TextInput
                  id="email"
                  type="email"
                  name="email"
                  value={data.email}
                  className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                  autoComplete="username"
                  isFocused={true}
                  onChange={(e) => setData('email', e.target.value)}
                  placeholder="you@example.com" />

                                <InputError message={errors.email} className="mt-2" />
                            </div>

                            <PrimaryButton
                className="w-full justify-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-150"
                disabled={processing}>

                                {processing ? 'Sending...' : 'Send Reset Link'}
                            </PrimaryButton>

                            <div className="text-center pt-2">
                                <Link
                  href={route('login')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center">

                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="mt-6 text-center text-sm text-gray-500">
                        © 2025 RC PrintShoppe. All rights reserved.
                    </p>
                </div>
            </div>
        </>);

}