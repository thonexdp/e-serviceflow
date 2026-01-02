<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <!-- Developed By: Antonio Jr De Paz | Custom Web App | 2025 -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>RC PrintShoppe</title>

    <!-- Favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('favicons/favicon-32x32.png') }}">
    <link rel="icon" type="image/png" sizes="16x16" href="{{ asset('favicons/favicon-16x16.png') }}">

    <!-- Apple Touch Icons -->
    <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('favicons/apple-touch-icon.png') }}">
    <link rel="apple-touch-icon" sizes="152x152" href="{{ asset('favicons/apple-touch-icon-152x152.png') }}">
    <link rel="apple-touch-icon" sizes="120x120" href="{{ asset('favicons/apple-touch-icon-120x120.png') }}">
    <link rel="apple-touch-icon" sizes="76x76" href="{{ asset('favicons/apple-touch-icon-76x76.png') }}">

    <!-- Android/Manifest -->
    <link rel="manifest" href="{{ asset('favicons/site.webmanifest') }}">


    <!-- Preserve your existing CSS libraries -->
    <link href="{{ asset('css/lib/calendar2/pignose.calendar.min.css') }}" rel="stylesheet">
    <link href="{{ asset('css/lib/chartist/chartist.min.css') }}" rel="stylesheet">
    <link href="{{ asset('css/lib/font-awesome.min.css') }}" rel="stylesheet">
    <link href="{{ asset('css/lib/themify-icons.css') }}" rel="stylesheet">
    <link href="{{ asset('css/lib/owl.carousel.min.css') }}" rel="stylesheet">
    <link href="{{ asset('css/lib/owl.theme.default.min.css') }}" rel="stylesheet">
    <!-- <link href="{{ asset('css/lib/weather-icons.css') }}" rel="stylesheet"> -->
    <link href="{{ asset('css/lib/menubar/sidebar.css') }}" rel="stylesheet">
    <link href="{{ asset('css/lib/bootstrap.min.css') }}" rel="stylesheet">
    <link href="{{ asset('css/lib/helper.css') }}" rel="stylesheet">
    <link href="{{ asset('css/style.css') }}" rel="stylesheet">



    @routes
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
    @inertiaHead
</head>

<body>
    @inertia

    <!-- Preserve your existing JS libraries -->
    <script src="{{ asset('js/lib/jquery.min.js') }}"></script>
    <script src="{{ asset('js/lib/jquery.nanoscroller.min.js') }}"></script>
    <script src="{{ asset('js/lib/menubar/sidebar.js') }}"></script>
    <script src="{{ asset('js/lib/preloader/pace.min.js') }}"></script>
    <script src="{{ asset('js/lib/bootstrap.min.js') }}"></script>
    <script src="{{ asset('js/scripts.js') }}"></script>
    <script src="{{ asset('js/lib/calendar-2/moment.latest.min.js') }}"></script>
    <script src="{{ asset('js/lib/calendar-2/pignose.calendar.min.js') }}"></script>
    <script src="{{ asset('js/lib/calendar-2/pignose.init.js') }}"></script>
    <!-- <script src="{{ asset('js/lib/weather/jquery.simpleWeather.min.js') }}"></script>
    <script src="{{ asset('js/lib/weather/weather-init.js') }}"></script> -->
    <script src="{{ asset('js/lib/circle-progress/circle-progress.min.js') }}"></script>
    <script src="{{ asset('js/lib/circle-progress/circle-progress-init.js') }}"></script>
    {{-- <script src="{{ asset('js/lib/chartist/chartist.min.js') }}"></script> --}}
    <script src="{{ asset('js/lib/sparklinechart/jquery.sparkline.min.js') }}"></script>
    <script src="{{ asset('js/lib/sparklinechart/sparkline.init.js') }}"></script>
    <script src="{{ asset('js/lib/owl-carousel/owl.carousel.min.js') }}"></script>
    <script src="{{ asset('js/lib/owl-carousel/owl.carousel-init.js') }}"></script>
    {{-- <script src="{{ asset('js/dashboard2.js') }}"></script> --}}

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Basic initialization - specific chart init will happen in React components
            if (window.jQuery) {
                jQuery('.sidebar-toggle').off('click').on('click', function() {
                    jQuery('body').toggleClass('sidebar-collapse');
                });
            }
        });
    </script>
</body>

</html>