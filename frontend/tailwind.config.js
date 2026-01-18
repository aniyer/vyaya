/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fdf8f3',
                    100: '#f9ece0',
                    200: '#f2d9c1',
                    300: '#e8c198',
                    400: '#D4A574',
                    500: '#C9A961',
                    600: '#B8956A',
                    700: '#9A7B55',
                    800: '#7D6345',
                    900: '#654F38',
                    950: '#3d2f22',
                },
                surface: {
                    50: '#f5f5f5',
                    100: '#e5e5e5',
                    200: '#d4d4d4',
                    300: '#a3a3a3',
                    400: '#737373',
                    500: '#525252',
                    600: '#404040',
                    700: '#262626',
                    800: '#171717',
                    900: '#0a0a0a',
                    950: '#050505',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
