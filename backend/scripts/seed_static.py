"""
Static seed script — populates the DB with ~150 real LEGO sets, minifigs, and achievements.
No external API key required. Run: python -m scripts.seed_static
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base, AsyncSessionLocal
from app.models.set import LegoSet, Minifigure
from app.models.achievement import Achievement
import uuid

# ── SETS ────────────────────────────────────────────────────────────────────
SETS = [
    # Star Wars
    {"set_number":"75192","name":"Millennium Falcon","theme":"Star Wars","subtheme":"Ultimate Collector Series","year":2017,"pieces":7541,"minifigs":8,"msrp":849.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":1200.00,"image_url":"https://images.brickset.com/sets/images/75192-1.jpg"},
    {"set_number":"75313","name":"AT-AT","theme":"Star Wars","subtheme":"Ultimate Collector Series","year":2021,"pieces":6785,"minifigs":9,"msrp":849.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":900.00,"image_url":"https://images.brickset.com/sets/images/75313-1.jpg"},
    {"set_number":"75252","name":"Imperial Star Destroyer","theme":"Star Wars","subtheme":"Ultimate Collector Series","year":2019,"pieces":4784,"minifigs":2,"msrp":699.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":950.00,"image_url":"https://images.brickset.com/sets/images/75252-1.jpg"},
    {"set_number":"75309","name":"Republic Gunship","theme":"Star Wars","subtheme":"Ultimate Collector Series","year":2021,"pieces":3292,"minifigs":4,"msrp":349.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":550.00,"image_url":"https://images.brickset.com/sets/images/75309-1.jpg"},
    {"set_number":"75341","name":"The Razor Crest","theme":"Star Wars","subtheme":"Ultimate Collector Series","year":2022,"pieces":6187,"minifigs":4,"msrp":599.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":650.00,"image_url":"https://images.brickset.com/sets/images/75341-1.jpg"},
    {"set_number":"75290","name":"Mos Eisley Cantina","theme":"Star Wars","year":2020,"pieces":3187,"minifigs":21,"msrp":349.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":380.00,"image_url":"https://images.brickset.com/sets/images/75290-1.jpg"},
    {"set_number":"75257","name":"Millennium Falcon","theme":"Star Wars","year":2019,"pieces":1351,"minifigs":6,"msrp":169.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":220.00,"image_url":"https://images.brickset.com/sets/images/75257-1.jpg"},
    {"set_number":"75331","name":"The Razor Crest (Micro)","theme":"Star Wars","year":2022,"pieces":66,"minifigs":0,"msrp":9.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":12.00,"image_url":"https://images.brickset.com/sets/images/75331-1.jpg"},
    {"set_number":"75337","name":"AT-TE Walker","theme":"Star Wars","year":2022,"pieces":1082,"minifigs":5,"msrp":129.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":140.00,"image_url":"https://images.brickset.com/sets/images/75337-1.jpg"},
    {"set_number":"75355","name":"X-Wing Starfighter","theme":"Star Wars","subtheme":"Ultimate Collector Series","year":2023,"pieces":1949,"minifigs":0,"msrp":239.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":260.00,"image_url":"https://images.brickset.com/sets/images/75355-1.jpg"},
    {"set_number":"75375","name":"Millennium Falcon","theme":"Star Wars","year":2024,"pieces":921,"minifigs":5,"msrp":119.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":125.00,"image_url":"https://images.brickset.com/sets/images/75375-1.jpg"},
    {"set_number":"75376","name":"Tantive IV","theme":"Star Wars","year":2024,"pieces":654,"minifigs":4,"msrp":79.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":84.00,"image_url":"https://images.brickset.com/sets/images/75376-1.jpg"},
    {"set_number":"75379","name":"R2-D2","theme":"Star Wars","year":2024,"pieces":1050,"minifigs":0,"msrp":99.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":105.00,"image_url":"https://images.brickset.com/sets/images/75379-1.jpg"},
    {"set_number":"75349","name":"Captain Rex Helmet","theme":"Star Wars","year":2023,"pieces":854,"minifigs":0,"msrp":69.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":75.00,"image_url":"https://images.brickset.com/sets/images/75349-1.jpg"},
    {"set_number":"75350","name":"Clone Commander Cody Helmet","theme":"Star Wars","year":2023,"pieces":766,"minifigs":0,"msrp":69.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":75.00,"image_url":"https://images.brickset.com/sets/images/75350-1.jpg"},
    {"set_number":"75345","name":"501st Clone Troopers Battle Pack","theme":"Star Wars","year":2023,"pieces":119,"minifigs":4,"msrp":19.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":22.00,"image_url":"https://images.brickset.com/sets/images/75345-1.jpg"},
    {"set_number":"75362","name":"Ahsoka Tano's T-6 Jedi Shuttle","theme":"Star Wars","year":2023,"pieces":601,"minifigs":5,"msrp":79.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":85.00,"image_url":"https://images.brickset.com/sets/images/75362-1.jpg"},
    {"set_number":"75347","name":"TIE Bomber","theme":"Star Wars","year":2023,"pieces":625,"minifigs":2,"msrp":64.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":70.00,"image_url":"https://images.brickset.com/sets/images/75347-1.jpg"},
    {"set_number":"75325","name":"The Mandalorian's N-1 Starfighter","theme":"Star Wars","year":2022,"pieces":412,"minifigs":4,"msrp":49.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":70.00,"image_url":"https://images.brickset.com/sets/images/75325-1.jpg"},
    {"set_number":"75356","name":"Executor Super Star Destroyer","theme":"Star Wars","subtheme":"Ultimate Collector Series","year":2023,"pieces":630,"minifigs":0,"msrp":79.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":85.00,"image_url":"https://images.brickset.com/sets/images/75356-1.jpg"},
    # Harry Potter
    {"set_number":"71043","name":"Hogwarts Castle","theme":"Harry Potter","year":2018,"pieces":6020,"minifigs":4,"msrp":469.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":750.00,"image_url":"https://images.brickset.com/sets/images/71043-1.jpg"},
    {"set_number":"76391","name":"Hogwarts Icons Collectors' Edition","theme":"Harry Potter","year":2021,"pieces":3010,"minifigs":0,"msrp":249.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":320.00,"image_url":"https://images.brickset.com/sets/images/76391-1.jpg"},
    {"set_number":"75969","name":"Hogwarts Astronomy Tower","theme":"Harry Potter","year":2020,"pieces":971,"minifigs":8,"msrp":99.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":160.00,"image_url":"https://images.brickset.com/sets/images/75969-1.jpg"},
    {"set_number":"76389","name":"Hogwarts Chamber of Secrets","theme":"Harry Potter","year":2021,"pieces":1176,"minifigs":6,"msrp":129.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":180.00,"image_url":"https://images.brickset.com/sets/images/76389-1.jpg"},
    {"set_number":"76415","name":"The Battle of Hogwarts","theme":"Harry Potter","year":2023,"pieces":730,"minifigs":8,"msrp":89.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":95.00,"image_url":"https://images.brickset.com/sets/images/76415-1.jpg"},
    {"set_number":"76426","name":"Hogwarts Boathouse","theme":"Harry Potter","year":2024,"pieces":660,"minifigs":5,"msrp":79.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":82.00,"image_url":"https://images.brickset.com/sets/images/76426-1.jpg"},
    {"set_number":"76417","name":"Gringotts Wizarding Bank — Collectors' Edition","theme":"Harry Potter","year":2023,"pieces":4803,"minifigs":0,"msrp":449.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":480.00,"image_url":"https://images.brickset.com/sets/images/76417-1.jpg"},
    {"set_number":"76403","name":"The Ministry of Magic","theme":"Harry Potter","year":2022,"pieces":990,"minifigs":12,"msrp":99.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":145.00,"image_url":"https://images.brickset.com/sets/images/76403-1.jpg"},
    # Technic
    {"set_number":"42170","name":"Kawasaki Ninja H2R Motorcycle","theme":"Technic","year":2024,"pieces":643,"minifigs":0,"msrp":59.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":62.00,"image_url":"https://images.brickset.com/sets/images/42170-1.jpg"},
    {"set_number":"42171","name":"Mercedes-AMG F1 W14 E Performance","theme":"Technic","year":2024,"pieces":1642,"minifigs":0,"msrp":229.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":240.00,"image_url":"https://images.brickset.com/sets/images/42171-1.jpg"},
    {"set_number":"42143","name":"Ferrari Daytona SP3","theme":"Technic","year":2022,"pieces":3778,"minifigs":0,"msrp":399.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":430.00,"image_url":"https://images.brickset.com/sets/images/42143-1.jpg"},
    {"set_number":"42131","name":"Cat D11 Bulldozer","theme":"Technic","year":2021,"pieces":3854,"minifigs":0,"msrp":449.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":600.00,"image_url":"https://images.brickset.com/sets/images/42131-1.jpg"},
    {"set_number":"42115","name":"Lamborghini Sián FKP 37","theme":"Technic","year":2020,"pieces":3696,"minifigs":0,"msrp":379.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":520.00,"image_url":"https://images.brickset.com/sets/images/42115-1.jpg"},
    {"set_number":"42083","name":"Bugatti Chiron","theme":"Technic","year":2018,"pieces":3599,"minifigs":0,"msrp":369.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":480.00,"image_url":"https://images.brickset.com/sets/images/42083-1.jpg"},
    {"set_number":"42156","name":"PEUGEOT 9X8 24H Le Mans Hybrid Hypercar","theme":"Technic","year":2023,"pieces":1775,"minifigs":0,"msrp":199.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":210.00,"image_url":"https://images.brickset.com/sets/images/42156-1.jpg"},
    {"set_number":"42160","name":"Audi RS Q e-tron","theme":"Technic","year":2023,"pieces":914,"minifigs":0,"msrp":99.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":105.00,"image_url":"https://images.brickset.com/sets/images/42160-1.jpg"},
    {"set_number":"42159","name":"Yamaha MT-10 SP","theme":"Technic","year":2023,"pieces":1478,"minifigs":0,"msrp":169.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":178.00,"image_url":"https://images.brickset.com/sets/images/42159-1.jpg"},
    {"set_number":"42141","name":"McLaren Formula 1 Race Car","theme":"Technic","year":2022,"pieces":1432,"minifigs":0,"msrp":179.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":240.00,"image_url":"https://images.brickset.com/sets/images/42141-1.jpg"},
    {"set_number":"42140","name":"App-Controlled Transformation Vehicle","theme":"Technic","year":2022,"pieces":772,"minifigs":0,"msrp":129.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":160.00,"image_url":"https://images.brickset.com/sets/images/42140-1.jpg"},
    # City
    {"set_number":"60388","name":"Gaming Tournament Truck","theme":"City","year":2023,"pieces":344,"minifigs":3,"msrp":44.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":46.00,"image_url":"https://images.brickset.com/sets/images/60388-1.jpg"},
    {"set_number":"60380","name":"Downtown","theme":"City","year":2023,"pieces":2010,"minifigs":14,"msrp":199.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":210.00,"image_url":"https://images.brickset.com/sets/images/60380-1.jpg"},
    {"set_number":"60337","name":"Express Passenger Train","theme":"City","year":2022,"pieces":764,"minifigs":6,"msrp":199.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":210.00,"image_url":"https://images.brickset.com/sets/images/60337-1.jpg"},
    {"set_number":"60320","name":"Fire Station","theme":"City","year":2022,"pieces":843,"minifigs":6,"msrp":99.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":130.00,"image_url":"https://images.brickset.com/sets/images/60320-1.jpg"},
    {"set_number":"60271","name":"Main Square","theme":"City","year":2020,"pieces":1517,"minifigs":15,"msrp":199.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":280.00,"image_url":"https://images.brickset.com/sets/images/60271-1.jpg"},
    {"set_number":"60369","name":"Mobile Police Dog Training","theme":"City","year":2023,"pieces":197,"minifigs":2,"msrp":29.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":31.00,"image_url":"https://images.brickset.com/sets/images/60369-1.jpg"},
    {"set_number":"60374","name":"Fire Command Truck","theme":"City","year":2023,"pieces":502,"minifigs":4,"msrp":59.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":62.00,"image_url":"https://images.brickset.com/sets/images/60374-1.jpg"},
    {"set_number":"60383","name":"Electric Sports Car","theme":"City","year":2023,"pieces":95,"minifigs":1,"msrp":9.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":11.00,"image_url":"https://images.brickset.com/sets/images/60383-1.jpg"},
    # Creator Expert / Modular Buildings
    {"set_number":"10297","name":"Boutique Hotel","theme":"Creator Expert","subtheme":"Modular Buildings","year":2022,"pieces":2090,"minifigs":0,"msrp":199.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":270.00,"image_url":"https://images.brickset.com/sets/images/10297-1.jpg"},
    {"set_number":"10278","name":"Police Station","theme":"Creator Expert","subtheme":"Modular Buildings","year":2021,"pieces":2923,"minifigs":0,"msrp":199.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":310.00,"image_url":"https://images.brickset.com/sets/images/10278-1.jpg"},
    {"set_number":"10270","name":"Bookshop","theme":"Creator Expert","subtheme":"Modular Buildings","year":2020,"pieces":2504,"minifigs":0,"msrp":199.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":320.00,"image_url":"https://images.brickset.com/sets/images/10270-1.jpg"},
    {"set_number":"10255","name":"Assembly Square","theme":"Creator Expert","subtheme":"Modular Buildings","year":2017,"pieces":4002,"minifigs":0,"msrp":279.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":500.00,"image_url":"https://images.brickset.com/sets/images/10255-1.jpg"},
    {"set_number":"10330","name":"McLaren MP4/4 & Ayrton Senna","theme":"Creator Expert","year":2024,"pieces":693,"minifigs":1,"msrp":99.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":105.00,"image_url":"https://images.brickset.com/sets/images/10330-1.jpg"},
    {"set_number":"10328","name":"Bouquet of Roses","theme":"Creator Expert","year":2024,"pieces":822,"minifigs":0,"msrp":59.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":62.00,"image_url":"https://images.brickset.com/sets/images/10328-1.jpg"},
    {"set_number":"10323","name":"PAC-MAN Arcade","theme":"Creator Expert","year":2023,"pieces":2651,"minifigs":0,"msrp":269.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":285.00,"image_url":"https://images.brickset.com/sets/images/10323-1.jpg"},
    {"set_number":"10320","name":"Starfort","theme":"Creator Expert","year":2023,"pieces":2267,"minifigs":0,"msrp":229.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":240.00,"image_url":"https://images.brickset.com/sets/images/10320-1.jpg"},
    {"set_number":"10307","name":"Eiffel Tower","theme":"Creator Expert","year":2022,"pieces":10001,"minifigs":0,"msrp":629.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":660.00,"image_url":"https://images.brickset.com/sets/images/10307-1.jpg"},
    {"set_number":"10308","name":"Holiday Main Street","theme":"Creator Expert","subtheme":"Modular Buildings","year":2022,"pieces":1514,"minifigs":0,"msrp":99.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":150.00,"image_url":"https://images.brickset.com/sets/images/10308-1.jpg"},
    # Ideas
    {"set_number":"21325","name":"Medieval Blacksmith","theme":"Ideas","year":2021,"pieces":2164,"minifigs":4,"msrp":179.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":280.00,"image_url":"https://images.brickset.com/sets/images/21325-1.jpg"},
    {"set_number":"21335","name":"Motorized Lighthouse","theme":"Ideas","year":2022,"pieces":2065,"minifigs":0,"msrp":219.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":240.00,"image_url":"https://images.brickset.com/sets/images/21335-1.jpg"},
    {"set_number":"21347","name":"Old Trafford – Manchester United","theme":"Ideas","year":2023,"pieces":3898,"minifigs":0,"msrp":349.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":370.00,"image_url":"https://images.brickset.com/sets/images/21347-1.jpg"},
    {"set_number":"21348","name":"Dungeons & Dragons: Red Dragon's Tale","theme":"Ideas","year":2024,"pieces":3745,"minifigs":0,"msrp":359.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":375.00,"image_url":"https://images.brickset.com/sets/images/21348-1.jpg"},
    {"set_number":"21317","name":"Steamboat Willie","theme":"Ideas","year":2019,"pieces":751,"minifigs":2,"msrp":89.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":150.00,"image_url":"https://images.brickset.com/sets/images/21317-1.jpg"},
    {"set_number":"21318","name":"Tree House","theme":"Ideas","year":2019,"pieces":3036,"minifigs":4,"msrp":249.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":380.00,"image_url":"https://images.brickset.com/sets/images/21318-1.jpg"},
    {"set_number":"21337","name":"Table Football","theme":"Ideas","year":2022,"pieces":2339,"minifigs":0,"msrp":249.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":310.00,"image_url":"https://images.brickset.com/sets/images/21337-1.jpg"},
    {"set_number":"21341","name":"Disney Hocus Pocus: The Sanderson Sisters' Cottage","theme":"Ideas","year":2023,"pieces":2316,"minifigs":0,"msrp":199.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":210.00,"image_url":"https://images.brickset.com/sets/images/21341-1.jpg"},
    # Marvel
    {"set_number":"76269","name":"Avengers Tower","theme":"Marvel","year":2023,"pieces":5201,"minifigs":31,"msrp":499.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":530.00,"image_url":"https://images.brickset.com/sets/images/76269-1.jpg"},
    {"set_number":"76261","name":"Spider-Man Final Battle","theme":"Marvel","year":2023,"pieces":900,"minifigs":7,"msrp":99.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":105.00,"image_url":"https://images.brickset.com/sets/images/76261-1.jpg"},
    {"set_number":"76218","name":"Sanctum Sanctorum","theme":"Marvel","year":2022,"pieces":2708,"minifigs":9,"msrp":249.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":270.00,"image_url":"https://images.brickset.com/sets/images/76218-1.jpg"},
    {"set_number":"76210","name":"Hulkbuster","theme":"Marvel","year":2022,"pieces":4049,"minifigs":4,"msrp":549.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":580.00,"image_url":"https://images.brickset.com/sets/images/76210-1.jpg"},
    {"set_number":"76178","name":"Daily Bugle","theme":"Marvel","year":2021,"pieces":3772,"minifigs":25,"msrp":349.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":550.00,"image_url":"https://images.brickset.com/sets/images/76178-1.jpg"},
    {"set_number":"76229","name":"Black Panther Mech Armor","theme":"Marvel","year":2022,"pieces":124,"minifigs":1,"msrp":14.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":22.00,"image_url":"https://images.brickset.com/sets/images/76229-1.jpg"},
    {"set_number":"76241","name":"Wolverine Mech Armor","theme":"Marvel","year":2023,"pieces":141,"minifigs":1,"msrp":14.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":16.00,"image_url":"https://images.brickset.com/sets/images/76241-1.jpg"},
    # Architecture
    {"set_number":"21060","name":"Himeji Castle","theme":"Architecture","year":2023,"pieces":2125,"minifigs":0,"msrp":149.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":155.00,"image_url":"https://images.brickset.com/sets/images/21060-1.jpg"},
    {"set_number":"21058","name":"Great Pyramid of Giza","theme":"Architecture","year":2022,"pieces":1476,"minifigs":0,"msrp":119.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":125.00,"image_url":"https://images.brickset.com/sets/images/21058-1.jpg"},
    {"set_number":"21056","name":"Taj Mahal","theme":"Architecture","year":2021,"pieces":2022,"minifigs":0,"msrp":119.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":175.00,"image_url":"https://images.brickset.com/sets/images/21056-1.jpg"},
    {"set_number":"21044","name":"Paris","theme":"Architecture","year":2019,"pieces":649,"minifigs":0,"msrp":59.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":90.00,"image_url":"https://images.brickset.com/sets/images/21044-1.jpg"},
    {"set_number":"21054","name":"The White House","theme":"Architecture","year":2020,"pieces":1483,"minifigs":0,"msrp":99.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":145.00,"image_url":"https://images.brickset.com/sets/images/21054-1.jpg"},
    {"set_number":"21057","name":"Singapore","theme":"Architecture","year":2022,"pieces":827,"minifigs":0,"msrp":74.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":78.00,"image_url":"https://images.brickset.com/sets/images/21057-1.jpg"},
    # Speed Champions
    {"set_number":"76914","name":"Ferrari 812 Competizione","theme":"Speed Champions","year":2023,"pieces":261,"minifigs":1,"msrp":24.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":26.00,"image_url":"https://images.brickset.com/sets/images/76914-1.jpg"},
    {"set_number":"76908","name":"Lamborghini Huracán Super Trofeo EVO2","theme":"Speed Champions","year":2022,"pieces":229,"minifigs":1,"msrp":19.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":32.00,"image_url":"https://images.brickset.com/sets/images/76908-1.jpg"},
    {"set_number":"76901","name":"Toyota GR Supra","theme":"Speed Champions","year":2021,"pieces":299,"minifigs":1,"msrp":24.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":40.00,"image_url":"https://images.brickset.com/sets/images/76901-1.jpg"},
    {"set_number":"76916","name":"Pagani Utopia","theme":"Speed Champions","year":2023,"pieces":249,"minifigs":1,"msrp":24.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":26.00,"image_url":"https://images.brickset.com/sets/images/76916-1.jpg"},
    {"set_number":"76919","name":"2023 McLaren Formula 1 Race Car","theme":"Speed Champions","year":2023,"pieces":245,"minifigs":1,"msrp":24.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":26.00,"image_url":"https://images.brickset.com/sets/images/76919-1.jpg"},
    # Minecraft
    {"set_number":"21189","name":"The Skeleton Dungeon","theme":"Minecraft","year":2022,"pieces":364,"minifigs":0,"msrp":49.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":52.00,"image_url":"https://images.brickset.com/sets/images/21189-1.jpg"},
    {"set_number":"21188","name":"The Llama Village","theme":"Minecraft","year":2022,"pieces":1252,"minifigs":0,"msrp":99.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":105.00,"image_url":"https://images.brickset.com/sets/images/21188-1.jpg"},
    {"set_number":"21178","name":"The Fox Lodge","theme":"Minecraft","year":2022,"pieces":193,"minifigs":0,"msrp":29.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":45.00,"image_url":"https://images.brickset.com/sets/images/21178-1.jpg"},
    {"set_number":"21196","name":"The End Battle","theme":"Minecraft","year":2023,"pieces":265,"minifigs":0,"msrp":39.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":42.00,"image_url":"https://images.brickset.com/sets/images/21196-1.jpg"},
    {"set_number":"21197","name":"The Deep Dark Battle","theme":"Minecraft","year":2023,"pieces":584,"minifigs":0,"msrp":69.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":73.00,"image_url":"https://images.brickset.com/sets/images/21197-1.jpg"},
    # Icons / Botanical
    {"set_number":"10281","name":"Bonsai Tree","theme":"Icons","year":2021,"pieces":878,"minifigs":0,"msrp":49.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":75.00,"image_url":"https://images.brickset.com/sets/images/10281-1.jpg"},
    {"set_number":"10280","name":"Flower Bouquet","theme":"Icons","year":2021,"pieces":756,"minifigs":0,"msrp":49.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":70.00,"image_url":"https://images.brickset.com/sets/images/10280-1.jpg"},
    {"set_number":"10311","name":"Orchid","theme":"Icons","year":2022,"pieces":608,"minifigs":0,"msrp":49.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":52.00,"image_url":"https://images.brickset.com/sets/images/10311-1.jpg"},
    {"set_number":"10313","name":"Wild Flower Bouquet","theme":"Icons","year":2023,"pieces":939,"minifigs":0,"msrp":59.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":62.00,"image_url":"https://images.brickset.com/sets/images/10313-1.jpg"},
    {"set_number":"10315","name":"Tranquil Garden","theme":"Icons","year":2023,"pieces":1363,"minifigs":0,"msrp":109.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":115.00,"image_url":"https://images.brickset.com/sets/images/10315-1.jpg"},
    {"set_number":"10300","name":"Back to the Future Time Machine","theme":"Icons","year":2022,"pieces":1872,"minifigs":3,"msrp":169.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":190.00,"image_url":"https://images.brickset.com/sets/images/10300-1.jpg"},
    {"set_number":"10302","name":"Optimus Prime","theme":"Icons","year":2022,"pieces":1508,"minifigs":0,"msrp":169.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":185.00,"image_url":"https://images.brickset.com/sets/images/10302-1.jpg"},
    {"set_number":"10306","name":"Atari 2600","theme":"Icons","year":2022,"pieces":2532,"minifigs":0,"msrp":239.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":255.00,"image_url":"https://images.brickset.com/sets/images/10306-1.jpg"},
    {"set_number":"10290","name":"Pickup Truck","theme":"Icons","year":2022,"pieces":1677,"minifigs":0,"msrp":99.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":140.00,"image_url":"https://images.brickset.com/sets/images/10290-1.jpg"},
    {"set_number":"10305","name":"Lion Knights' Castle","theme":"Icons","year":2022,"pieces":4514,"minifigs":22,"msrp":399.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":430.00,"image_url":"https://images.brickset.com/sets/images/10305-1.jpg"},
    {"set_number":"10321","name":"Rivendell","theme":"Icons","year":2023,"pieces":6167,"minifigs":15,"msrp":499.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":530.00,"image_url":"https://images.brickset.com/sets/images/10321-1.jpg"},
    # Art
    {"set_number":"31206","name":"The Rolling Stones","theme":"Art","year":2023,"pieces":3994,"minifigs":0,"msrp":249.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":260.00,"image_url":"https://images.brickset.com/sets/images/31206-1.jpg"},
    {"set_number":"31205","name":"World Map","theme":"Art","year":2021,"pieces":11695,"minifigs":0,"msrp":249.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":270.00,"image_url":"https://images.brickset.com/sets/images/31205-1.jpg"},
    {"set_number":"31199","name":"Marvel Studios Iron Man","theme":"Art","year":2021,"pieces":3167,"minifigs":0,"msrp":199.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":260.00,"image_url":"https://images.brickset.com/sets/images/31199-1.jpg"},
    {"set_number":"31203","name":"World Map","theme":"Art","year":2021,"pieces":11695,"minifigs":0,"msrp":249.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":270.00,"image_url":"https://images.brickset.com/sets/images/31203-1.jpg"},
    # Disney
    {"set_number":"43225","name":"The Little Mermaid Royal Clamshell","theme":"Disney","year":2023,"pieces":1808,"minifigs":0,"msrp":199.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":210.00,"image_url":"https://images.brickset.com/sets/images/43225-1.jpg"},
    {"set_number":"43222","name":"Disney Castle","theme":"Disney","year":2023,"pieces":4837,"minifigs":0,"msrp":349.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":370.00,"image_url":"https://images.brickset.com/sets/images/43222-1.jpg"},
    {"set_number":"43219","name":"Disney Classic Animation","theme":"Disney","year":2023,"pieces":1022,"minifigs":0,"msrp":99.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":105.00,"image_url":"https://images.brickset.com/sets/images/43219-1.jpg"},
    {"set_number":"43226","name":"Belle and the Beast's Castle","theme":"Disney","year":2023,"pieces":505,"minifigs":0,"msrp":64.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":68.00,"image_url":"https://images.brickset.com/sets/images/43226-1.jpg"},
    # Ninjago
    {"set_number":"71799","name":"NINJAGO City Markets","theme":"Ninjago","year":2023,"pieces":6163,"minifigs":18,"msrp":329.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":350.00,"image_url":"https://images.brickset.com/sets/images/71799-1.jpg"},
    {"set_number":"71741","name":"NINJAGO City Gardens","theme":"Ninjago","year":2021,"pieces":5685,"minifigs":19,"msrp":299.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":420.00,"image_url":"https://images.brickset.com/sets/images/71741-1.jpg"},
    {"set_number":"70657","name":"NINJAGO City Docks","theme":"Ninjago","year":2018,"pieces":3553,"minifigs":15,"msrp":299.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":500.00,"image_url":"https://images.brickset.com/sets/images/70657-1.jpg"},
    {"set_number":"71794","name":"Lloyd and Arin's Ninja Team Mechs","theme":"Ninjago","year":2023,"pieces":764,"minifigs":5,"msrp":89.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":95.00,"image_url":"https://images.brickset.com/sets/images/71794-1.jpg"},
    # Jurassic World
    {"set_number":"76961","name":"Visitor Center: T. rex & Raptor Attack","theme":"Jurassic World","year":2023,"pieces":693,"minifigs":5,"msrp":89.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":95.00,"image_url":"https://images.brickset.com/sets/images/76961-1.jpg"},
    {"set_number":"76956","name":"T. rex Breakout","theme":"Jurassic World","year":2022,"pieces":1212,"minifigs":4,"msrp":99.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":140.00,"image_url":"https://images.brickset.com/sets/images/76956-1.jpg"},
    {"set_number":"76960","name":"Brachiosaurus Discovery","theme":"Jurassic World","year":2023,"pieces":512,"minifigs":3,"msrp":59.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":63.00,"image_url":"https://images.brickset.com/sets/images/76960-1.jpg"},
    # Haunted House / Seasonal
    {"set_number":"10273","name":"Haunted House","theme":"Creator Expert","year":2020,"pieces":3231,"minifigs":0,"msrp":269.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":420.00,"image_url":"https://images.brickset.com/sets/images/10273-1.jpg"},
    # Creator 3-in-1
    {"set_number":"31120","name":"Medieval Castle","theme":"Creator","year":2021,"pieces":1426,"minifigs":5,"msrp":99.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":150.00,"image_url":"https://images.brickset.com/sets/images/31120-1.jpg"},
    {"set_number":"31130","name":"Sunken Treasure Mission","theme":"Creator","year":2022,"pieces":522,"minifigs":0,"msrp":49.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":70.00,"image_url":"https://images.brickset.com/sets/images/31130-1.jpg"},
    {"set_number":"31150","name":"Wild Safari Animals","theme":"Creator","year":2024,"pieces":780,"minifigs":0,"msrp":59.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":62.00,"image_url":"https://images.brickset.com/sets/images/31150-1.jpg"},
    # Batman / DC
    {"set_number":"76240","name":"Batmobile Tumbler","theme":"DC","year":2021,"pieces":2049,"minifigs":2,"msrp":229.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":True,"estimated_value":250.00,"image_url":"https://images.brickset.com/sets/images/76240-1.jpg"},
    {"set_number":"76271","name":"Batman: The Animated Series Gotham City","theme":"DC","year":2023,"pieces":4210,"minifigs":9,"msrp":399.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":420.00,"image_url":"https://images.brickset.com/sets/images/76271-1.jpg"},
    {"set_number":"76265","name":"Batwing: Batman vs. The Joker","theme":"DC","year":2023,"pieces":357,"minifigs":2,"msrp":39.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":42.00,"image_url":"https://images.brickset.com/sets/images/76265-1.jpg"},
    # Monkie Kid
    {"set_number":"80049","name":"Monkie Kid's Team Hideout","theme":"Monkie Kid","year":2023,"pieces":1314,"minifigs":9,"msrp":129.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":135.00,"image_url":"https://images.brickset.com/sets/images/80049-1.jpg"},
    {"set_number":"80056","name":"Sandy's Power Loader Mech","theme":"Monkie Kid","year":2023,"pieces":1855,"minifigs":7,"msrp":179.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":188.00,"image_url":"https://images.brickset.com/sets/images/80056-1.jpg"},
    # Friends
    {"set_number":"41732","name":"Downtown Flower and Design Stores","theme":"Friends","year":2023,"pieces":1046,"minifigs":5,"msrp":99.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":105.00,"image_url":"https://images.brickset.com/sets/images/41732-1.jpg"},
    {"set_number":"41722","name":"Horse Show Trailer","theme":"Friends","year":2023,"pieces":545,"minifigs":3,"msrp":59.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":62.00,"image_url":"https://images.brickset.com/sets/images/41722-1.jpg"},
    {"set_number":"41729","name":"Organic Grocery Store","theme":"Friends","year":2023,"pieces":1100,"minifigs":6,"msrp":99.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":105.00,"image_url":"https://images.brickset.com/sets/images/41729-1.jpg"},
    # DREAMZzz
    {"set_number":"71469","name":"Nightmare Shark Ship","theme":"DREAMZzz","year":2023,"pieces":1389,"minifigs":6,"msrp":129.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":135.00,"image_url":"https://images.brickset.com/sets/images/71469-1.jpg"},
    {"set_number":"71477","name":"The Sandman's Tower","theme":"DREAMZzz","year":2024,"pieces":723,"minifigs":4,"msrp":79.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":84.00,"image_url":"https://images.brickset.com/sets/images/71477-1.jpg"},
    # Indiana Jones
    {"set_number":"77015","name":"Temple of the Golden Idol","theme":"Indiana Jones","year":2023,"pieces":1545,"minifigs":8,"msrp":149.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":158.00,"image_url":"https://images.brickset.com/sets/images/77015-1.jpg"},
    {"set_number":"77013","name":"Escape from the Lost Tomb","theme":"Indiana Jones","year":2023,"pieces":600,"minifigs":6,"msrp":69.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":74.00,"image_url":"https://images.brickset.com/sets/images/77013-1.jpg"},
    {"set_number":"77012","name":"Fighter Plane Chase","theme":"Indiana Jones","year":2023,"pieces":387,"minifigs":4,"msrp":39.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":42.00,"image_url":"https://images.brickset.com/sets/images/77012-1.jpg"},
    # Sonic the Hedgehog
    {"set_number":"76993","name":"Sonic's Speed Sphere Challenge","theme":"Sonic the Hedgehog","year":2023,"pieces":292,"minifigs":3,"msrp":34.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":37.00,"image_url":"https://images.brickset.com/sets/images/76993-1.jpg"},
    {"set_number":"76994","name":"Sonic's Green Hill Zone Loop Challenge","theme":"Sonic the Hedgehog","year":2023,"pieces":802,"minifigs":6,"msrp":99.99,"currency":"USD","availability":"available","is_retired":False,"retiring_soon":False,"estimated_value":105.00,"image_url":"https://images.brickset.com/sets/images/76994-1.jpg"},
    # Avatar
    {"set_number":"75578","name":"Metkayina Reef Home","theme":"Avatar","year":2022,"pieces":528,"minifigs":4,"msrp":49.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":75.00,"image_url":"https://images.brickset.com/sets/images/75578-1.jpg"},
    # Botanical / GWP misc
    {"set_number":"40460","name":"Roses","theme":"Icons","year":2021,"pieces":120,"minifigs":0,"msrp":12.99,"currency":"USD","availability":"retired","is_retired":True,"retiring_soon":False,"estimated_value":20.00,"image_url":"https://images.brickset.com/sets/images/40460-1.jpg"},
]

# ── MINIFIGURES ─────────────────────────────────────────────────────────────
MINIFIGS = [
    {"fig_number":"sw0001","name":"Luke Skywalker (Tatooine)","character_name":"Luke Skywalker","theme":"Star Wars","year":1999,"is_cmf":False,"rarity":"uncommon","estimated_value":8.00},
    {"fig_number":"sw0003","name":"Darth Vader","character_name":"Darth Vader","theme":"Star Wars","year":1999,"is_cmf":False,"rarity":"uncommon","estimated_value":12.00},
    {"fig_number":"sw0010","name":"Yoda","character_name":"Yoda","theme":"Star Wars","year":2002,"is_cmf":False,"rarity":"rare","estimated_value":25.00},
    {"fig_number":"sw0201","name":"Jango Fett","character_name":"Jango Fett","theme":"Star Wars","year":2002,"is_cmf":False,"rarity":"rare","estimated_value":35.00},
    {"fig_number":"sw1239","name":"The Mandalorian","character_name":"Din Djarin","theme":"Star Wars","year":2020,"is_cmf":False,"rarity":"uncommon","estimated_value":15.00},
    {"fig_number":"sw1277","name":"Grogu","character_name":"Grogu","theme":"Star Wars","year":2021,"is_cmf":False,"rarity":"rare","estimated_value":18.00},
    {"fig_number":"sw0536","name":"Han Solo (Hoth)","character_name":"Han Solo","theme":"Star Wars","year":2014,"is_cmf":False,"rarity":"uncommon","estimated_value":14.00},
    {"fig_number":"sw1045","name":"Boba Fett (Helmet)","character_name":"Boba Fett","theme":"Star Wars","year":2018,"is_cmf":False,"rarity":"rare","estimated_value":30.00},
    {"fig_number":"sw0649","name":"Princess Leia (Hoth)","character_name":"Princess Leia","theme":"Star Wars","year":2016,"is_cmf":False,"rarity":"uncommon","estimated_value":12.00},
    {"fig_number":"sw0002","name":"Obi-Wan Kenobi (Episode IV)","character_name":"Obi-Wan Kenobi","theme":"Star Wars","year":1999,"is_cmf":False,"rarity":"uncommon","estimated_value":10.00},
    {"fig_number":"hp001","name":"Harry Potter (Gryffindor)","character_name":"Harry Potter","theme":"Harry Potter","year":2001,"is_cmf":False,"rarity":"uncommon","estimated_value":10.00},
    {"fig_number":"hp010","name":"Hermione Granger","character_name":"Hermione Granger","theme":"Harry Potter","year":2001,"is_cmf":False,"rarity":"uncommon","estimated_value":10.00},
    {"fig_number":"hp100","name":"Dumbledore","character_name":"Albus Dumbledore","theme":"Harry Potter","year":2018,"is_cmf":False,"rarity":"rare","estimated_value":20.00},
    {"fig_number":"hp050","name":"Voldemort","character_name":"Lord Voldemort","theme":"Harry Potter","year":2010,"is_cmf":False,"rarity":"rare","estimated_value":28.00},
    {"fig_number":"hp075","name":"Severus Snape","character_name":"Severus Snape","theme":"Harry Potter","year":2018,"is_cmf":False,"rarity":"uncommon","estimated_value":14.00},
    {"fig_number":"col001","name":"Cheerleader","theme":"Collectible Minifigures","year":2010,"is_cmf":True,"cmf_series":"Series 1","rarity":"common","estimated_value":5.00},
    {"fig_number":"col002","name":"Tribal Hunter","theme":"Collectible Minifigures","year":2010,"is_cmf":True,"cmf_series":"Series 1","rarity":"common","estimated_value":6.00},
    {"fig_number":"col003","name":"Zombie","theme":"Collectible Minifigures","year":2010,"is_cmf":True,"cmf_series":"Series 1","rarity":"uncommon","estimated_value":8.00},
    {"fig_number":"col071","name":"Cowboy Costume Guy","theme":"Collectible Minifigures","year":2019,"is_cmf":True,"cmf_series":"Series 19","rarity":"uncommon","estimated_value":7.00},
    {"fig_number":"col420","name":"Dino Costume Guy","theme":"Collectible Minifigures","year":2020,"is_cmf":True,"cmf_series":"Series 20","rarity":"rare","estimated_value":12.00},
    {"fig_number":"col421","name":"Llama Costume Girl","theme":"Collectible Minifigures","year":2020,"is_cmf":True,"cmf_series":"Series 20","rarity":"uncommon","estimated_value":9.00},
    {"fig_number":"col500","name":"Viking","theme":"Collectible Minifigures","year":2021,"is_cmf":True,"cmf_series":"Series 21","rarity":"uncommon","estimated_value":8.00},
    {"fig_number":"col501","name":"Alien","theme":"Collectible Minifigures","year":2021,"is_cmf":True,"cmf_series":"Series 21","rarity":"ultra_rare","estimated_value":20.00},
    {"fig_number":"marv001","name":"Iron Man (Mark 3)","character_name":"Tony Stark / Iron Man","theme":"Marvel","year":2012,"is_cmf":False,"rarity":"uncommon","estimated_value":15.00},
    {"fig_number":"marv002","name":"Captain America","character_name":"Steve Rogers","theme":"Marvel","year":2012,"is_cmf":False,"rarity":"uncommon","estimated_value":12.00},
    {"fig_number":"marv050","name":"Spider-Man (Classic)","character_name":"Peter Parker","theme":"Marvel","year":2012,"is_cmf":False,"rarity":"common","estimated_value":8.00},
    {"fig_number":"marv100","name":"Thanos","character_name":"Thanos","theme":"Marvel","year":2018,"is_cmf":False,"rarity":"rare","estimated_value":22.00},
    {"fig_number":"bat001","name":"Batman (Classic)","character_name":"Bruce Wayne","theme":"DC","year":2006,"is_cmf":False,"rarity":"uncommon","estimated_value":10.00},
    {"fig_number":"idea001","name":"Astronaut (Female)","theme":"Ideas","year":2021,"is_cmf":False,"rarity":"uncommon","estimated_value":8.00},
    {"fig_number":"col600","name":"Shipwrecked Pirate","theme":"Collectible Minifigures","year":2022,"is_cmf":True,"cmf_series":"Series 22","rarity":"common","estimated_value":6.00},
]

# ── ACHIEVEMENTS ─────────────────────────────────────────────────────────────
ACHIEVEMENTS = [
    {"id":"ach001","key":"first_set","name":"First Brick","description":"Add your first set to your collection","icon":"🧱","rarity":"bronze","xp_reward":50,"target":1,"category":"collection"},
    {"id":"ach002","key":"ten_sets","name":"Growing Collection","description":"Own 10 sets","icon":"📦","rarity":"bronze","xp_reward":100,"target":10,"category":"collection"},
    {"id":"ach003","key":"fifty_sets","name":"Serious Collector","description":"Own 50 sets","icon":"🏛️","rarity":"silver","xp_reward":300,"target":50,"category":"collection"},
    {"id":"ach004","key":"hundred_sets","name":"Century Builder","description":"Own 100 sets","icon":"💯","rarity":"gold","xp_reward":750,"target":100,"category":"collection"},
    {"id":"ach005","key":"first_retired","name":"Treasure Hunter","description":"Own a retired set","icon":"🏆","rarity":"silver","xp_reward":200,"target":1,"category":"rarity"},
    {"id":"ach006","key":"ten_retired","name":"Retired Collector","description":"Own 10 retired sets","icon":"🏅","rarity":"gold","xp_reward":500,"target":10,"category":"rarity"},
    {"id":"ach007","key":"first_moc","name":"Creator","description":"Share your first MOC","icon":"🔨","rarity":"bronze","xp_reward":100,"target":1,"category":"community"},
    {"id":"ach008","key":"wishlist_ten","name":"Dreamer","description":"Add 10 sets to your wishlist","icon":"⭐","rarity":"bronze","xp_reward":75,"target":10,"category":"wishlist"},
    {"id":"ach009","key":"star_wars_fan","name":"Star Wars Fanatic","description":"Own 10 Star Wars sets","icon":"⚔️","rarity":"silver","xp_reward":250,"target":10,"category":"theme"},
    {"id":"ach010","key":"cmf_collector","name":"CMF Collector","description":"Own 20 Collectible Minifigures","icon":"🎭","rarity":"gold","xp_reward":400,"target":20,"category":"minifigs"},
]

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        from sqlalchemy import select, func
        count_result = await session.execute(select(func.count()).select_from(LegoSet))
        existing = count_result.scalar()
        if existing and existing > 10:
            print(f"Database already has {existing} sets. Skipping seed.")
            return

        print("Seeding LEGO sets...")
        for s in SETS:
            lego_set = LegoSet(
                id=str(uuid.uuid4()),
                **s
            )
            session.add(lego_set)
        await session.flush()
        print(f"  + {len(SETS)} sets added")

        print("Seeding minifigures...")
        for m in MINIFIGS:
            fig = Minifigure(id=str(uuid.uuid4()), image_url=None, **m)
            session.add(fig)
        await session.flush()
        print(f"  + {len(MINIFIGS)} minifigures added")

        print("Seeding achievements...")
        for a in ACHIEVEMENTS:
            ach = Achievement(**a)
            session.add(ach)
        await session.flush()
        print(f"  + {len(ACHIEVEMENTS)} achievements added")

        await session.commit()
        print("\nSeed complete!")
        print(f"   {len(SETS)} sets · {len(MINIFIGS)} minifigures · {len(ACHIEVEMENTS)} achievements")

if __name__ == "__main__":
    asyncio.run(seed())
