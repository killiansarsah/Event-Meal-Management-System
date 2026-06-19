import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="bg-background-secondary border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="text-xl font-bold text-accent">Elira</div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-foreground hover:text-accent transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6">
            Event Management Made Simple
          </h1>
          <p className="text-xl text-foreground-secondary mb-8">
            Streamline your event operations with comprehensive tools for registration, meal management, catering coordination, and financial tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-accent text-white px-8 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="border-2 border-accent text-accent px-8 py-3 rounded-lg font-semibold hover:bg-accent hover:text-white transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-background-secondary py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-foreground mb-12">
            Powerful Features for Event Organizers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-background p-6 rounded-lg border border-border hover:border-accent transition-colors">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Event Management</h3>
              <p className="text-foreground-secondary">
                Create and manage events with customizable categories, sessions, and staff assignments.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background p-6 rounded-lg border border-border hover:border-accent transition-colors">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Registration Management</h3>
              <p className="text-foreground-secondary">
                Handle online and on-site registrations with real-time tracking and offline support.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background p-6 rounded-lg border border-border hover:border-accent transition-colors">
              <div className="text-4xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Meal Coordination</h3>
              <p className="text-foreground-secondary">
                Manage meal sessions, scanning with QR codes, and track meal service in real-time.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-background p-6 rounded-lg border border-border hover:border-accent transition-colors">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Payment Tracking</h3>
              <p className="text-foreground-secondary">
                Track and manage participant payments with detailed reports and export capabilities.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-background p-6 rounded-lg border border-border hover:border-accent transition-colors">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Reporting & Analytics</h3>
              <p className="text-foreground-secondary">
                Generate comprehensive reports with CSV, PDF, and Excel export options.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-background p-6 rounded-lg border border-border hover:border-accent transition-colors">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Offline Support</h3>
              <p className="text-foreground-secondary">
                Continue working offline with automatic sync when connectivity returns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-4xl font-bold text-foreground mb-4">
          Ready to streamline your events?
        </h2>
        <p className="text-xl text-foreground-secondary mb-8">
          Join thousands of event organizers using Elira to manage their events.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-accent text-white px-8 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
        >
          Start Free Trial
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-background-secondary border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-foreground-secondary">
          <p>&copy; 2024 Elira Event Platform. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
