import {
  FactoryIcon,
  FileTextIcon,
  HeadphonesIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  MonitorIcon,
  PieChartIcon,
  SettingsIcon,
  ZapIcon,
} from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";

const navigationItems = [
  {
    icon: LayoutDashboardIcon,
    label: "Tableau\nde bord",
    isActive: true,
    link: "/dashboard",
  },
];

const categoryItems = [
  {
    icon: FactoryIcon,
    label: "Directe",
  },
  {
    icon: ZapIcon,
    label: "Énergie",
  },
  {
    icon: MonitorIcon,
    label: "Indirecte",
  },
];

const reportItems = [
  {
    icon: PieChartIcon,
    label: "Bilan",
  },
  {
    icon: FileTextIcon,
    label: "Rapport",
  },
];

const actionCards = [
  {
    title: "Plan de décarbonation",
    description:
      "Définissez vos objectifs et suivez vos réductions d'émissions.",
    buttonText: "Fixer mes objectifs",
    image:
      "https://c.animaapp.com/mfajxzr53fl1iI/img/users-people-trophy-awards-01.png",
    imageClasses: "w-[132px] h-[169px]",
  },
  {
    title: "Conformité carbone",
    description: "Mesurez l'impact carbone de chaque produit selon MCAF/CBAM.",
    buttonText: "Analyser mes produits",
    image:
      "https://c.animaapp.com/mfajxzr53fl1iI/img/business-business-deal-01.png",
    imageClasses: "w-[184px] h-[147px]",
  },
  {
    title: "Rapport de durabilité",
    description:
      "Générez votre rapport de durabilité,\nprêt à être partager à vos partenaires.",
    buttonText: "Générer le rapport",
    image:
      "https://c.animaapp.com/mfajxzr53fl1iI/img/finances-investing-01.png",
    imageClasses: "w-[221px] h-[199px]",
  },
];

const sidebarCards = [
  {
    title: "Besoin de conseils ?",
    description: "Quelques conseils pour commencer votre virage vert",
    backgroundImage:
      "https://c.animaapp.com/mfajxzr53fl1iI/img/adobestock-504535930-1.png",
  },
  {
    title: "Passer à l'action !",
    description: "Découvrez comment passer\nà l'action dès maintenant",
    backgroundImage:
      "https://c.animaapp.com/mfajxzr53fl1iI/img/adobestock-416529705-1.png",
  },
  {
    title: "Apprenez avec nous !",
    description: "Consulter nos formations",
    backgroundImage:
      "https://c.animaapp.com/mfajxzr53fl1iI/img/adobestock-416529705-2.png",
  },
];

export const Dashboard = (): JSX.Element => {
  return (
    <div
      className="bg-white grid justify-items-center [align-items:start] w-screen translate-y-[-1rem] animate-fade-in opacity-0"
      data-model-id="171:315"
    >
      <div className="bg-white overflow-hidden w-[1440px] h-[1024px] relative">
        {/* Right Sidebar Cards */}
        <div className="absolute right-[20px] top-[396px] space-y-[21px] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
          {sidebarCards.map((card, index) => (
            <Card
              key={index}
              className="w-[335px] h-[188px] relative overflow-hidden rounded-2xl"
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${card.backgroundImage})` }}
              />
              <img
                className="absolute w-full h-full top-0 left-0"
                alt="Overlay"
                src="https://c.animaapp.com/mfajxzr53fl1iI/img/adobestock-244312786-4.svg"
              />
              <CardContent className="relative z-10 p-0 h-full">
                <div className="absolute w-[309px] top-[17px] left-[13px] [text-shadow:0px_4px_20px_#404040] [font-family:'Inter',Helvetica] font-bold text-white text-xl text-center tracking-[0] leading-[normal]">
                  {card.title}
                </div>
                <div className="absolute w-[282px] h-10 top-[136px] left-7">
                  <img
                    className="absolute w-2 h-3 top-3.5 left-[271px]"
                    alt="Arrow"
                    src="https://c.animaapp.com/mfajxzr53fl1iI/img/vector.svg"
                  />
                  <div className="absolute w-[260px] top-0 left-0 [font-family:'Montserrat',Helvetica] font-medium text-white text-base text-right tracking-[0] leading-[normal]">
                    {card.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Left Sidebar */}
        <aside className="absolute w-[118px] h-[1172px] top-[-70px] left-0 bg-white shadow-drop-shadow translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
          {/* Profile Section */}
          <div className="absolute w-[75px] h-[75px] top-[105px] left-[21px]">
            <div className="relative h-[75px]">
              <div className="absolute w-[72px] h-[72px] top-0.5 left-0.5 bg-[#f5f6f5] rounded-[36px]" />
              <img
                className="absolute w-[75px] h-[75px] top-0 left-0 object-cover rounded-full"
                alt="Profile"
                src="https://c.animaapp.com/mfajxzr53fl1iI/img/image-1.png"
              />
            </div>
          </div>

          {/* Support Icons */}
          <HeadphonesIcon className="absolute w-8 h-[31px] top-[968px] left-[43px] text-gray-600" />
          <SettingsIcon className="absolute w-[30px] h-[30px] top-[1029px] left-11 text-gray-600" />

          {/* Date Range */}
          <div className="absolute top-[190px] left-[18px] [font-family:'Montserrat',Helvetica] font-medium text-[#8f8f8f] text-base text-center tracking-[0] leading-4">
            Oct 2023
            <br />-<br />
            Août 2024
          </div>

          {/* Navigation */}
          <nav className="absolute w-[89px] h-[576px] top-[294px] left-[15px]">
            <div className="w-[89px] items-start gap-[18px] flex flex-col relative">
              {/* Dashboard Button */}
              <Card className="relative w-[89px] h-[90px] bg-[#f5f6f5] rounded-2xl">
                <CardContent className="p-0 h-full">
                  <Link
                    className="relative w-[60px] h-[67px] top-3.5 left-[15px] block"
                    to="/dashboard"
                  >
                    <LayoutDashboardIcon className="absolute w-6 h-6 top-0 left-[17px] text-[#344e41]" />
                    <img
                      className="absolute w-[49px] h-0.5 top-[65px] left-1"
                      alt="Line"
                      src="https://c.animaapp.com/mfajxzr53fl1iI/img/line-1.svg"
                    />
                    <div className="absolute top-7 left-0 [font-family:'Inter',Helvetica] font-semibold text-[#344e41] text-sm text-center tracking-[0] leading-[normal]">
                      Tableau
                      <br />
                      de bord
                    </div>
                  </Link>
                </CardContent>
              </Card>

              {/* Categories Section */}
              <Card className="relative w-[89px] h-[270px] bg-[#f5f6f5] rounded-2xl">
                <CardContent className="p-0 h-full">
                  <div className="w-[75px] items-start gap-[25px] top-7 left-[7px] flex flex-col relative">
                    {categoryItems.map((item, index) => (
                      <div
                        key={index}
                        className="items-center gap-1 self-stretch w-full flex-[0_0_auto] flex flex-col relative"
                      >
                        <item.icon className="relative w-[29.4px] h-[28.74px] text-[#8f8f8f]" />
                        <div className="relative self-stretch [font-family:'Inter',Helvetica] font-medium text-[#8f8f8f] text-sm text-center tracking-[0] leading-[normal]">
                          {item.label}
                        </div>
                        <img
                          className="relative w-[49px] h-0.5"
                          alt="Line"
                          src="https://c.animaapp.com/mfajxzr53fl1iI/img/line-1.svg"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Reports Section */}
              <Card className="relative w-[89px] h-[180px] bg-[#f5f6f5] rounded-2xl">
                <CardContent className="p-0 h-full">
                  <div className="w-[75px] items-start gap-[25px] top-[23px] left-[7px] flex flex-col relative">
                    {reportItems.map((item, index) => (
                      <div
                        key={index}
                        className="items-center gap-1 self-stretch w-full flex-[0_0_auto] flex flex-col relative"
                      >
                        <item.icon className="relative w-[29.97px] h-[29.97px] text-[#8f8f8f]" />
                        <div className="relative self-stretch [font-family:'Inter',Helvetica] font-medium text-[#8f8f8f] text-sm text-center tracking-[0] leading-[normal]">
                          {item.label}
                        </div>
                        <img
                          className="relative w-[49px] h-0.5"
                          alt="Line"
                          src="https://c.animaapp.com/mfajxzr53fl1iI/img/line-1.svg"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </nav>
        </aside>

        {/* Header */}
        <header className="absolute top-[30px] left-[138px] right-[20px] flex justify-between items-center translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:300ms]">
          <h1 className="[font-family:'Inter',Helvetica] font-bold text-neutral-700 text-[32px] tracking-[0] leading-[normal]">
            Tableau de bord
          </h1>
          <div className="flex items-center gap-4">
            <Button className="w-56 h-12 bg-[#344e41] rounded-2xl text-white [font-family:'Inter',Helvetica] font-semibold text-base">
              Changer de période
            </Button>
            <HelpCircleIcon className="w-[30px] h-[30px] text-gray-600" />
          </div>
        </header>

        {/* Welcome Section */}
        <section className="absolute w-[927px] h-[278px] top-[106px] left-[138px] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:500ms]">
          <Card className="absolute w-[927px] h-[271px] top-0 left-0">
            <CardContent className="p-0 h-full relative">
              <div className="w-[927px] h-[169px] top-[58px] bg-[#f5f6f5] absolute left-0 rounded-2xl" />
              <div className="absolute top-[81px] left-[30px] [font-family:'Inter',Helvetica] font-bold text-neutral-700 text-[32px] tracking-[0] leading-[normal]">
                Rebienvenue Carbone Québec !
              </div>
              <div className="absolute top-[124px] left-[30px] [font-family:'Montserrat',Helvetica] font-medium text-[#8f8f8f] text-sm tracking-[0] leading-[normal]">
                Prêt à passer à l'action ?
              </div>
              <Button className="absolute top-[166px] left-[30px] w-[220px] h-11 bg-white rounded-2xl border-2 border-solid border-neutral-700 text-neutral-700 [font-family:'Inter',Helvetica] font-semibold text-base">
                Voir votre progression
              </Button>
              <img
                className="absolute w-[280px] h-[271px] top-0 left-[605px]"
                alt="Business charts"
                src="https://c.animaapp.com/mfajxzr53fl1iI/img/business-charts-pie-and-bars.png"
              />
            </CardContent>
          </Card>
        </section>

        {/* "Vos outils pour agir" Title */}
        <div className="absolute top-[414px] left-[168px] [font-family:'Inter',Helvetica] font-bold text-neutral-700 text-2xl tracking-[0] leading-[normal] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:550ms]">
          Vos outils pour agir :
        </div>

        {/* Action Cards */}
        <section className="absolute w-[572px] h-[568px] top-[456px] left-[138px] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms]">
          <Card className="w-[572px] h-[568px] bg-[#f5f6f5] rounded-2xl">
            <CardContent className="p-[19px] h-full relative">
              {actionCards.map((card, index) => (
                <Card
                  key={index}
                  className={`w-[534px] h-[175px] bg-white rounded-2xl absolute ${
                    index === 0
                      ? "top-0 left-0"
                      : index === 1
                        ? "top-[195px] left-0"
                        : "top-[390px] left-0"
                  }`}
                >
                  <CardContent className="p-0 h-full relative">
                    <div
                      className={`absolute [font-family:'Inter',Helvetica] font-bold text-neutral-700 text-2xl tracking-[0] leading-[normal] ${
                        index === 0
                          ? "top-[39px] left-[214px]"
                          : index === 1
                            ? "top-[39px] left-[47px]"
                            : "top-[39px] left-[216px]"
                      }`}
                    >
                      {card.title}
                    </div>
                    <div
                      className={`absolute [font-family:'Montserrat',Helvetica] font-medium text-neutral-700 text-sm tracking-[0] leading-[normal] ${
                        index === 0
                          ? "w-[282px] top-[81px] left-[216px]"
                          : index === 1
                            ? "w-72 top-[81px] left-[47px]"
                            : "w-[311px] top-[81px] left-[218px]"
                      }`}
                    >
                      {card.description}
                    </div>
                    <Button
                      className={`absolute w-[220px] h-11 bg-white rounded-2xl border-2 border-solid border-neutral-700 text-neutral-700 [font-family:'Inter',Helvetica] font-semibold text-base ${
                        index === 0
                          ? "top-[139px] left-[315px]"
                          : index === 1
                            ? "top-[139px] left-[45px]"
                            : "top-[139px] left-[317px]"
                      }`}
                    >
                      {card.buttonText}
                    </Button>
                    <img
                      className={`absolute ${card.imageClasses} ${
                        index === 0
                          ? "top-[9px] left-[57px]"
                          : index === 1
                            ? "top-[14px] left-[346px]"
                            : "top-[-24px] left-3"
                      }`}
                      alt={card.title}
                      src={card.image}
                    />
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Statistics Card */}
        <Card className="absolute w-[335px] h-[293px] top-[396px] left-[730px] bg-[#f5f6f5] rounded-2xl translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:700ms]">
          <CardContent className="p-6 h-full relative">
            <div className="absolute w-[307px] h-[197px] top-6 left-3.5">
              <div className="absolute top-[67px] left-[115px] [font-family:'Inter',Helvetica] font-bold text-neutral-700 text-[32px] tracking-[0] leading-[normal]">
                63 %
              </div>
              <div className="absolute w-[307px] top-[121px] left-0 [font-family:'Montserrat',Helvetica] font-medium text-neutral-700 text-sm text-center tracking-[0] leading-[normal]">
                de vos émissions proviennent
                <br />
                d'émissions directement produites par votre entreprise
              </div>
              <div className="absolute w-[197px] h-[197px] top-0 left-14 rotate-180">
                <div className="relative h-[99px] top-[99px]">
                  <img
                    className="absolute w-[129px] h-[99px] top-0 left-[68px] -rotate-180"
                    alt="Chart segment"
                    src="https://c.animaapp.com/mfajxzr53fl1iI/img/ellipse-1.svg"
                  />
                  <img
                    className="absolute w-20 h-[94px] top-0 left-0 -rotate-180"
                    alt="Chart segment"
                    src="https://c.animaapp.com/mfajxzr53fl1iI/img/ellipse.svg"
                  />
                </div>
              </div>
            </div>
            <Button className="absolute top-[228px] left-[60px] w-[220px] h-11 bg-white rounded-2xl border-2 border-solid border-neutral-700 text-neutral-700 [font-family:'Inter',Helvetica] font-semibold text-base">
              Consulter notre bilan
            </Button>
          </CardContent>
        </Card>

        {/* Action Plan Card */}
        <Card className="absolute w-[335px] h-[293px] top-[709px] left-[730px] bg-[#f5f6f5] rounded-2xl translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:800ms]">
          <CardContent className="p-5 h-full relative">
            <div className="absolute top-5 left-[93px] [font-family:'Inter',Helvetica] font-bold text-neutral-700 text-2xl text-center tracking-[0] leading-[normal]">
              Plan d'action
            </div>
            <img
              className="absolute w-[111px] h-[65px] top-[73px] left-28"
              alt="Action plan icon"
              src="https://c.animaapp.com/mfajxzr53fl1iI/img/vector-5.svg"
            />
            <div className="absolute w-[307px] top-40 left-3.5 [font-family:'Montserrat',Helvetica] font-medium text-neutral-700 text-sm text-center tracking-[0] leading-[normal]">
              Un plan d'action clair et des communications ciblées grâce à l'IA.
            </div>
            <Button className="absolute top-[229px] left-[60px] w-[220px] h-11 bg-white rounded-2xl border-2 border-solid border-neutral-700 text-neutral-700 [font-family:'Inter',Helvetica] font-semibold text-base">
              En apprendre plus
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
