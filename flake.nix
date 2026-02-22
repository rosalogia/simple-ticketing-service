{
  description = "STS dev shell — PostgreSQL 16 + uv";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";

  outputs = { self, nixpkgs }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
    in {
      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          pgPort = "5435";
          pgData = "$PWD/.postgres-data";
        in {
          default = pkgs.mkShell {
            packages = [
              pkgs.postgresql_16
              pkgs.uv
            ];

            shellHook = ''
              export PGDATA="${pgData}"
              export PGPORT="${pgPort}"
              export PGHOST=localhost

              # First-time init
              if [ ! -d "$PGDATA" ]; then
                echo "Initializing PostgreSQL data directory..."
                initdb --no-locale --encoding=UTF8 -D "$PGDATA"
                # Listen only on localhost
                echo "port = ${pgPort}" >> "$PGDATA/postgresql.conf"
                echo "unix_socket_directories = '$PGDATA'" >> "$PGDATA/postgresql.conf"
                echo "listen_addresses = 'localhost'" >> "$PGDATA/postgresql.conf"
                echo "timezone = 'UTC'" >> "$PGDATA/postgresql.conf"
              fi

              # Start PG if not already running
              if ! pg_ctl status -D "$PGDATA" > /dev/null 2>&1; then
                echo "Starting PostgreSQL on port ${pgPort}..."
                pg_ctl start -D "$PGDATA" -l "$PGDATA/postgres.log" -o "-k $PGDATA"
                sleep 1
              fi

              # Create databases if they don't exist
              for db in sts sts_test; do
                if ! psql -h "$PGDATA" -p ${pgPort} -lqt | cut -d \| -f 1 | grep -qw "$db"; then
                  echo "Creating database: $db"
                  createdb -h "$PGDATA" -p ${pgPort} "$db"
                fi
              done

              export DATABASE_URL="postgresql://localhost:${pgPort}/sts"
              echo "PostgreSQL running on port ${pgPort} — databases: sts, sts_test"
              echo "DATABASE_URL=$DATABASE_URL"
            '';
          };
        }
      );
    };
}
