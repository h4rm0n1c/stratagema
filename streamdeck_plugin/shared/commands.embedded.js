(function attachEmbeddedCommands(globalScope) {
  const commands = [
  {
    "id": "machine_gun",
    "code": "saswd",
    "cooldownSeconds": 410,
    "icon": "icons/machine_gun.png"
  },
  {
    "id": "anti_material_rifle",
    "code": "sadws",
    "cooldownSeconds": 410,
    "icon": "icons/anti_material_rifle.png"
  },
  {
    "id": "stalwart",
    "code": "saswwa",
    "cooldownSeconds": 410,
    "icon": "icons/stalwart.png"
  },
  {
    "id": "expendable_anti_tank",
    "code": "ssawd",
    "cooldownSeconds": 59,
    "icon": "icons/expendable_anti_tank.png"
  },
  {
    "id": "recoiless_rifle",
    "code": "sadda",
    "cooldownSeconds": 410,
    "icon": "icons/recoiless_rifle.png"
  },
  {
    "id": "flamethrower",
    "code": "sawsw",
    "cooldownSeconds": 410,
    "icon": "icons/flamethrower.png"
  },
  {
    "id": "autocannon",
    "code": "saswwd",
    "cooldownSeconds": 410,
    "icon": "icons/autocannon.png"
  },
  {
    "id": "heavy_machine_gun",
    "code": "sawss",
    "cooldownSeconds": 410,
    "icon": "icons/heavy_machine_gun.png"
  },
  {
    "id": "airburst_rocket_launcher",
    "code": "swwad",
    "cooldownSeconds": 410,
    "icon": "icons/airburst_rocket_launcher.png"
  },
  {
    "id": "commando",
    "code": "sawsd",
    "cooldownSeconds": 102,
    "icon": "icons/commando.png"
  },
  {
    "id": "railgun",
    "code": "sdswad",
    "cooldownSeconds": 410,
    "icon": "icons/railgun.png"
  },
  {
    "id": "spear",
    "code": "sswss",
    "cooldownSeconds": 410,
    "icon": "icons/spear.png"
  },
  {
    "id": "wasp",
    "code": "sswsd",
    "cooldownSeconds": 410,
    "icon": "icons/wasp.png"
  },
  {
    "id": "orbital_gatling_barrage",
    "code": "dsaww",
    "cooldownSeconds": 59,
    "icon": "icons/orbital_gatling_barrage.png"
  },
  {
    "id": "orbital_airburst_strike",
    "code": "ddd",
    "cooldownSeconds": 85,
    "icon": "icons/orbital_airburst_strike.png"
  },
  {
    "id": "orbital_120mm_he_barrage",
    "code": "ddsads",
    "cooldownSeconds": 153,
    "icon": "icons/orbital_120mm_he_barrage.png"
  },
  {
    "id": "orbital_380mm_he_barrage",
    "code": "dswwass",
    "cooldownSeconds": 205,
    "icon": "icons/orbital_380mm_he_barrage.png"
  },
  {
    "id": "orbital_walking_barrage",
    "code": "dsdsds",
    "cooldownSeconds": 205,
    "icon": "icons/orbital_walking_barrage.png"
  },
  {
    "id": "orbital_laser",
    "code": "dswds",
    "cooldownSeconds": 256,
    "icon": "icons/orbital_laser.png"
  },
  {
    "id": "orbital_napalm_barrage",
    "code": "ddsadw",
    "cooldownSeconds": 205,
    "icon": "icons/orbital_napalm_barrage.png"
  },
  {
    "id": "orbital_railcannon_strike",
    "code": "dwssd",
    "cooldownSeconds": 179,
    "icon": "icons/orbital_railcannon_strike.png"
  },
  {
    "id": "eagle_strafing_run",
    "code": "wdd",
    "cooldownSeconds": 6,
    "icon": "icons/eagle_strafing_run.png"
  },
  {
    "id": "eagle_airstrike",
    "code": "wdsd",
    "cooldownSeconds": 6,
    "icon": "icons/eagle_airstrike.png"
  },
  {
    "id": "eagle_cluster_bomb",
    "code": "wdssd",
    "cooldownSeconds": 6,
    "icon": "icons/eagle_cluster_bomb.png"
  },
  {
    "id": "eagle_napalm_airstrike",
    "code": "wdsw",
    "cooldownSeconds": 6,
    "icon": "icons/eagle_napalm_airstrike.png"
  },
  {
    "id": "jump_pack",
    "code": "swwsw",
    "cooldownSeconds": 410,
    "icon": "icons/jump_pack.png"
  },
  {
    "id": "eagle_smoke_strike",
    "code": "wdws",
    "cooldownSeconds": 6,
    "icon": "icons/eagle_smoke_strike.png"
  },
  {
    "id": "eagle_110mm_rocket_pods",
    "code": "wdwa",
    "cooldownSeconds": 6,
    "icon": "icons/eagle_110mm_rocket_pods.png"
  },
  {
    "id": "eagle_500kg_bomb",
    "code": "wdsss",
    "cooldownSeconds": 6,
    "icon": "icons/eagle_500kg_bomb.png"
  },
  {
    "id": "fast_recon_vehicle",
    "code": "asdsdsw",
    "cooldownSeconds": 410,
    "icon": "icons/fast_recon_vehicle.png"
  },
  {
    "id": "orbital_precision_strike",
    "code": "ddw",
    "cooldownSeconds": 76,
    "icon": "icons/orbital_precision_strike.png"
  },
  {
    "id": "orbital_gas_strike",
    "code": "ddsd",
    "cooldownSeconds": 64,
    "icon": "icons/orbital_gas_strike.png"
  },
  {
    "id": "orbital_ems_strike",
    "code": "ddas",
    "cooldownSeconds": 64,
    "icon": "icons/orbital_ems_strike.png"
  },
  {
    "id": "orbital_smoke_strike",
    "code": "ddsw",
    "cooldownSeconds": 85,
    "icon": "icons/orbital_smoke_strike.png"
  },
  {
    "id": "hmg_emplacement",
    "code": "swadda",
    "cooldownSeconds": 153,
    "icon": "icons/hmg_emplacement.png"
  },
  {
    "id": "shield_relay",
    "code": "ssadad",
    "cooldownSeconds": 76,
    "icon": "icons/shield_relay.png"
  },
  {
    "id": "tesla_tower",
    "code": "swdwad",
    "cooldownSeconds": 102,
    "icon": "icons/tesla_tower.png"
  },
  {
    "id": "ap_minefield",
    "code": "sawd",
    "cooldownSeconds": 120,
    "icon": "icons/ap_minefield.png"
  },
  {
    "id": "supply_pack",
    "code": "saswws",
    "cooldownSeconds": 410,
    "icon": "icons/supply_pack.png"
  },
  {
    "id": "grenade_launcher",
    "code": "sawas",
    "cooldownSeconds": 410,
    "icon": "icons/grenade_launcher.png"
  },
  {
    "id": "laser_cannon",
    "code": "saswa",
    "cooldownSeconds": 410,
    "icon": "icons/laser_cannon.png"
  },
  {
    "id": "incendiary_mines",
    "code": "saas",
    "cooldownSeconds": 120,
    "icon": "icons/incendiary_mines.png"
  },
  {
    "id": "guard_dog_rover",
    "code": "swawdd",
    "cooldownSeconds": 410,
    "icon": "icons/guard_dog_rover.png"
  },
  {
    "id": "ballistic_shield_backpack",
    "code": "sawwd",
    "cooldownSeconds": 256,
    "icon": "icons/ballistic_shield_backpack.png"
  },
  {
    "id": "arc_thrower",
    "code": "sdswaa",
    "cooldownSeconds": 410,
    "icon": "icons/arc_thrower.png"
  },
  {
    "id": "at_mines",
    "code": "saww",
    "cooldownSeconds": 120,
    "icon": "icons/at_mines.png"
  },
  {
    "id": "quasar",
    "code": "sswad",
    "cooldownSeconds": 410,
    "icon": "icons/quasar.png"
  },
  {
    "id": "shield_generator_pack",
    "code": "swadad",
    "cooldownSeconds": 410,
    "icon": "icons/shield_generator_pack.png"
  },
  {
    "id": "gas_mines",
    "code": "saad",
    "cooldownSeconds": 164,
    "icon": "icons/gas_mines.png"
  },
  {
    "id": "machine_gun_sentry",
    "code": "swddw",
    "cooldownSeconds": 76,
    "icon": "icons/machine_gun_sentry.png"
  },
  {
    "id": "gatling_sentry",
    "code": "swda",
    "cooldownSeconds": 128,
    "icon": "icons/gatling_sentry.png"
  },
  {
    "id": "mortar_sentry",
    "code": "swdds",
    "cooldownSeconds": 153,
    "icon": "icons/mortar_sentry.png"
  },
  {
    "id": "guard_dog",
    "code": "swawds",
    "cooldownSeconds": 410,
    "icon": "icons/guard_dog.png"
  },
  {
    "id": "autocannon_sentry",
    "code": "swdwaw",
    "cooldownSeconds": 128,
    "icon": "icons/autocannon_sentry.png"
  },
  {
    "id": "rocket_sentry",
    "code": "swdda",
    "cooldownSeconds": 128,
    "icon": "icons/rocket_sentry.png"
  },
  {
    "id": "ems_mortar",
    "code": "swdsd",
    "cooldownSeconds": 153,
    "icon": "icons/ems_mortar.png"
  },
  {
    "id": "patriot_exosuit",
    "code": "asdwass",
    "cooldownSeconds": 570,
    "icon": "icons/patriot_exosuit.png"
  },
  {
    "id": "emancipator_exosuit",
    "code": "asdwasw",
    "cooldownSeconds": 570,
    "icon": "icons/emancipator_exosuit.png"
  },
  {
    "id": "sterilizer",
    "code": "sawsa",
    "cooldownSeconds": 410,
    "icon": "icons/sterilizer.png"
  },
  {
    "id": "dog_breath",
    "code": "swawdw",
    "cooldownSeconds": 410,
    "icon": "icons/dog_breath.png"
  },
  {
    "id": "directional_shield",
    "code": "swadww",
    "cooldownSeconds": 256,
    "icon": "icons/directional_shield.png"
  },
  {
    "id": "at_emplacement",
    "code": "swaddd",
    "cooldownSeconds": 153,
    "icon": "icons/at_emplacement.png"
  },
  {
    "id": "flame_sentry",
    "code": "swdsww",
    "cooldownSeconds": 128,
    "icon": "icons/flame_sentry.png"
  },
  {
    "id": "reinforce",
    "code": "wsdaw",
    "cooldownSeconds": 0,
    "icon": "icons/reinforce.png"
  },
  {
    "id": "sos_beacon",
    "code": "wsaw",
    "cooldownSeconds": 0,
    "icon": "icons/sos_beacon.png"
  },
  {
    "id": "resupply",
    "code": "sswd",
    "cooldownSeconds": 171,
    "icon": "icons/resupply.png"
  },
  {
    "id": "eagle_rearm",
    "code": "wwawd",
    "cooldownSeconds": 0,
    "icon": "icons/eagle_rearm.png"
  },
  {
    "id": "sssd_delivery",
    "code": "sssww",
    "cooldownSeconds": 0,
    "icon": "icons/sssd_delivery.png"
  },
  {
    "id": "prospecting_drill",
    "code": "ssadss",
    "cooldownSeconds": 0,
    "icon": "icons/prospecting_drill.png"
  },
  {
    "id": "super_earth_flag",
    "code": "swsw",
    "cooldownSeconds": 0,
    "icon": "icons/super_earth_flag.png"
  },
  {
    "id": "hellbomb",
    "code": "swaswdsw",
    "cooldownSeconds": 0,
    "icon": "icons/hellbomb.png"
  },
  {
    "id": "upload_data",
    "code": "adwww",
    "cooldownSeconds": 0,
    "icon": "icons/upload_data.png"
  },
  {
    "id": "seismic_probe",
    "code": "wwaass",
    "cooldownSeconds": 0,
    "icon": "icons/seismic_probe.png"
  },
  {
    "id": "seaf_artillery",
    "code": "dwws",
    "cooldownSeconds": 0,
    "icon": "icons/seaf_artillery.png"
  },
  {
    "id": "hive_breaker_drill",
    "code": "awsdss",
    "cooldownSeconds": 0,
    "icon": "icons/hive_breaker_drill.png"
  },
  {
    "id": "porta_hellbomb",
    "code": "sdwww",
    "cooldownSeconds": 256,
    "icon": "icons/porta_hellbomb.png"
  },
  {
    "id": "hover_pack",
    "code": "swwsad",
    "cooldownSeconds": 410,
    "icon": "icons/hover_pack.png"
  },
  {
    "id": "grenadier_battlement",
    "code": "sdsad",
    "cooldownSeconds": 102,
    "icon": "icons/grenadier_battlement.png"
  },
  {
    "id": "one_true_flag",
    "code": "saddw",
    "cooldownSeconds": 410,
    "icon": "icons/one_true_flag.png"
  },
  {
    "id": "de_escalator",
    "code": "adwad",
    "cooldownSeconds": 410,
    "icon": "icons/de_escalator.png"
  },
  {
    "id": "guard_dog_stun",
    "code": "swawda",
    "cooldownSeconds": 410,
    "icon": "icons/guard_dog_stun.png"
  },
  {
    "id": "warp_pack",
    "code": "sadsad",
    "cooldownSeconds": 410,
    "icon": "icons/warp_pack.png"
  },
  {
    "id": "plas_epoch",
    "code": "sawad",
    "cooldownSeconds": 410,
    "icon": "icons/plas_epoch.png"
  },
  {
    "id": "laser_turret",
    "code": "swdswd",
    "cooldownSeconds": 410,
    "icon": "icons/laser_turret.png"
  }
];
  globalScope.StratagemaEmbeddedCommands = commands;
})(typeof window !== 'undefined' ? window : globalThis);
