import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function ServicesLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <Header />
            <main className="ml-80 mt-20 p-8">
                {children}
            </main>
        </div>
    )
}
