import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Blog() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <SectionHeader
          title="SwiftRent Blog"
          subtitle="Insights, tips, and perspectives on the rental market"
          showTagline={true}
        />
        
        <div className="space-y-8">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl font-bold">
                Why Paying Commission on Rentals Is Wrong
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Published on {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </CardHeader>
            
            <CardContent className="prose prose-gray max-w-none">
              <p className="text-lg text-muted-foreground mb-6">
                When it comes to renting a home, most landlords and tenants in South Africa have been conditioned to believe that paying commission to middlemen is "just the way it's done." But let's pause and ask a simple question: Why should anyone pay thousands of rands in commission for something they can manage directly and securely online?
              </p>
              
              <p className="mb-6">
                The truth is, paying commission is outdated, unfair, and unnecessary in today's digital world. Here's why.
              </p>
              
              <div className="border-l-4 border-primary pl-4 my-8">
                <div className="w-16 h-0.5 bg-muted-foreground mb-4"></div>
              </div>

              <div className="space-y-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">1. Commission Punishes Success</h3>
                  <p>
                    Think about it: the more your property is worth, the higher the agent's cut. A landlord renting out a R15,000/month apartment pays a lot more than someone renting out at R7,000/month — even though the effort to list and show the property is essentially the same.
                  </p>
                  <p className="mt-4">
                    Commission isn't linked to the actual work done; it's simply a penalty for having a valuable property. That doesn't sit right.
                  </p>
                </section>

                <div className="border-l-4 border-primary pl-4 my-8">
                  <div className="w-16 h-0.5 bg-muted-foreground"></div>
                </div>

                <section>
                  <h3 className="text-xl font-semibold mb-4">2. Landlords Lose Hard-Earned Income</h3>
                  <p>
                    Every rand you hand over in commission is money you could be using to pay your bond, cover maintenance, or reinvest in your property portfolio. For many landlords, those "small" commission percentages add up to tens of thousands of rands lost every year.
                  </p>
                  <p className="mt-4">
                    Why should you, the property owner, take on all the financial risk while someone else reaps the ongoing reward?
                  </p>
                </section>

                <div className="border-l-4 border-primary pl-4 my-8">
                  <div className="w-16 h-0.5 bg-muted-foreground"></div>
                </div>

                <section>
                  <h3 className="text-xl font-semibold mb-4">3. Tenants End Up Paying More Too</h3>
                  <p>
                    Commission doesn't just hurt landlords — it filters down to tenants as well. Landlords often raise rental prices to cover agent fees, meaning tenants pay inflated rates. The very system that's supposed to "help" both parties ends up hurting both sides.
                  </p>
                  <p className="mt-4">
                    A no-commission model means fairer rentals and more affordable housing.
                  </p>
                </section>

                <div className="border-l-4 border-primary pl-4 my-8">
                  <div className="w-16 h-0.5 bg-muted-foreground"></div>
                </div>

                <section>
                  <h3 className="text-xl font-semibold mb-4">4. Technology Has Replaced the Middleman</h3>
                  <p>
                    Years ago, landlords may have needed agents to advertise properties, handle paperwork, and do credit checks. But today, platforms like SwiftRent provide all of this — instantly, securely, and without hidden costs.
                  </p>
                  <p className="mt-4">
                    From ID verification and free credit checks to digital lease signing and automated maintenance requests, everything agents used to do can now be handled online at a fraction of the cost.
                  </p>
                </section>

                <div className="border-l-4 border-primary pl-4 my-8">
                  <div className="w-16 h-0.5 bg-muted-foreground"></div>
                </div>

                <section>
                  <h3 className="text-xl font-semibold mb-4">5. Transparency Builds Trust</h3>
                  <p>
                    Commission creates a conflict of interest: agents are incentivized to push higher rentals, faster turnovers, and quick deals — not necessarily what's best for you.
                  </p>
                  <p className="mt-4">
                    With a no-commission platform, there's no hidden agenda. Landlords and tenants connect directly, with full transparency, safety, and accountability.
                  </p>
                </section>

                <div className="border-l-4 border-primary pl-4 my-8">
                  <div className="w-16 h-0.5 bg-muted-foreground"></div>
                </div>

                <section>
                  <h3 className="text-xl font-semibold mb-4">6. Gratitude, Not Exploitation</h3>
                  <p>
                    At SwiftRent, we believe renting a home should be about building trust, not draining pockets. Landlords shouldn't feel exploited, and tenants shouldn't feel overcharged. A fair, subscription-based model ensures that everyone pays only for real value — not for outdated commission structures.
                  </p>
                </section>

                <div className="border-l-4 border-primary pl-4 my-8">
                  <div className="w-16 h-0.5 bg-muted-foreground"></div>
                </div>

                <section className="bg-muted/50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">The Bottom Line</h3>
                  <p>
                    Paying commission on rentals belongs in the past. The future is direct, digital, and commission-free.
                  </p>
                  <p className="mt-4">
                    Landlords deserve to keep their income. Tenants deserve fair rental prices. And both deserve a system that prioritizes safety, trust, and efficiency.
                  </p>
                  <p className="mt-4 font-medium">
                    That's why SwiftRent exists — to make renting simple, secure, and commission-free.
                  </p>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}